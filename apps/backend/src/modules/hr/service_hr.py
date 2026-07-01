from datetime import date, datetime
from decimal import Decimal
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.service.base_domain_service import BaseDomainService
from src.modules.finance.model_finance import (
    CashflowActivity,
    FinanceTransaction,
    TransactionStatus,
    TransactionType,
)
from src.modules.hr.model_hr import (
    AttendanceRecord,
    Employee,
    HRTask,
    KPIReview,
    KPIReviewItem,
    LeaveRequest,
    LeaveType,
    PayrollRun,
    PayrollSlip,
    PayrollStatus,
)


class EmployeeService(BaseDomainService):
    model_class = Employee


class AttendanceService(BaseDomainService):
    model_class = AttendanceRecord

    async def get_monthly_summary(self, company_id: UUID, start_date: date, end_date: date):
        query = (
            select(
                AttendanceRecord.employee_id,
                func.count(AttendanceRecord.id),
                func.coalesce(func.sum(AttendanceRecord.work_minutes), 0),
                func.coalesce(func.sum(AttendanceRecord.overtime_minutes), 0),
            )
            .where(
                AttendanceRecord.company_id == company_id,
                AttendanceRecord.attendance_date >= start_date,
                AttendanceRecord.attendance_date <= end_date,
            )
            .group_by(AttendanceRecord.employee_id)
        )

        result = await self.db.execute(query)

        return [
            {
                "employee_id": row[0],
                "attendance_count": row[1],
                "work_minutes": row[2],
                "overtime_minutes": row[3],
            }
            for row in result.all()
        ]


class LeaveTypeService(BaseDomainService):
    model_class = LeaveType


class LeaveRequestService(BaseDomainService):
    model_class = LeaveRequest


class HRTaskService(BaseDomainService):
    model_class = HRTask


class KPIReviewService(BaseDomainService):
    model_class = KPIReview

    async def recalculate_score(self, review_id: UUID):
        result = await self.db.execute(
            select(func.coalesce(func.sum(KPIReviewItem.weighted_score), 0))
            .where(KPIReviewItem.review_id == review_id)
        )

        total_score = Decimal(str(result.scalar_one()))

        review = await self.get_by_id(review_id)

        if review is None:
            return None

        review.total_score = total_score

        if total_score >= 90:
            review.rating = "A"
        elif total_score >= 80:
            review.rating = "B"
        elif total_score >= 70:
            review.rating = "C"
        else:
            review.rating = "D"

        await self.db.commit()
        await self.db.refresh(review)

        return review


class PayrollRunService(BaseDomainService):
    model_class = PayrollRun

    async def calculate_payroll(self, payroll_run_id: UUID):
        payroll_run = await self.get_by_id(payroll_run_id)

        if payroll_run is None:
            return None

        result = await self.db.execute(
            select(Employee)
            .where(
                Employee.company_id == payroll_run.company_id,
                Employee.status == "active",
            )
        )

        employees = list(result.scalars().all())

        total_gross = Decimal("0.00")
        total_deductions = Decimal("0.00")
        total_tax = Decimal("0.00")
        total_net = Decimal("0.00")

        for employee in employees:
            base_salary = employee.base_salary
            allowance = Decimal("0.00")
            bonus = Decimal("0.00")
            overtime = Decimal("0.00")
            deduction = Decimal("0.00")
            tax = (base_salary * Decimal("0.05")).quantize(Decimal("0.01"))
            net_pay = base_salary + allowance + bonus + overtime - deduction - tax

            slip = PayrollSlip(
                payroll_run_id=payroll_run.id,
                employee_id=employee.id,
                base_salary=base_salary,
                allowance_amount=allowance,
                bonus_amount=bonus,
                overtime_amount=overtime,
                deduction_amount=deduction,
                tax_amount=tax,
                net_pay=net_pay,
            )

            self.db.add(slip)

            total_gross += base_salary + allowance + bonus + overtime
            total_deductions += deduction
            total_tax += tax
            total_net += net_pay

        payroll_run.total_gross = total_gross
        payroll_run.total_deductions = total_deductions
        payroll_run.total_tax = total_tax
        payroll_run.total_net = total_net
        payroll_run.status = PayrollStatus.CALCULATED

        await self.db.commit()
        await self.db.refresh(payroll_run)

        return payroll_run

    async def create_finance_transaction(self, payroll_run_id: UUID):
        payroll_run = await self.get_by_id(payroll_run_id)

        if payroll_run is None:
            return None

        transaction = FinanceTransaction(
            company_id=payroll_run.company_id,
            branch_id=payroll_run.branch_id,
            transaction_no=f"PAYROLL-{payroll_run.payroll_no}",
            transaction_date=date.today(),
            transaction_type=TransactionType.EXPENSE,
            cashflow_activity=CashflowActivity.OPERATING,
            status=TransactionStatus.DRAFT,
            source_module="hr_payroll",
            source_id=payroll_run.id,
            subtotal_amount=payroll_run.total_net,
            total_amount=payroll_run.total_net,
            description=f"Payroll payment {payroll_run.payroll_no}",
        )

        self.db.add(transaction)
        await self.db.flush()

        payroll_run.finance_transaction_id = transaction.id

        await self.db.commit()
        await self.db.refresh(payroll_run)

        return payroll_run