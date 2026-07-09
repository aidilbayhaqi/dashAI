from datetime import date, datetime
from decimal import Decimal
from uuid import UUID

from sqlalchemy import delete, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status

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

from src.service.domain_integrity import (
    commit_or_raise,
    ensure_date_range,
    ensure_non_negative,
    flush_or_raise,
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

    async def _get_locked_payroll_run(self, payroll_run_id: UUID):
        result = await self.db.execute(
            select(PayrollRun)
            .where(PayrollRun.id == payroll_run_id)
            .with_for_update()
        )
        return result.scalar_one_or_none()

    async def calculate_payroll(self, payroll_run_id: UUID):
        payroll_run = await self._get_locked_payroll_run(payroll_run_id)

        if payroll_run is None:
            return None

        ensure_date_range(
            payroll_run.period_start,
            payroll_run.period_end,
            start_field="period_start",
            end_field="period_end",
        )

        if payroll_run.status in {
            PayrollStatus.CALCULATED,
            PayrollStatus.APPROVED,
            PayrollStatus.PAID,
        }:
            return payroll_run

        if payroll_run.status == PayrollStatus.CANCELLED:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Cancelled payroll cannot be calculated",
            )

        employee_query = select(Employee).where(
            Employee.company_id == payroll_run.company_id,
            Employee.status == "active",
        )

        if payroll_run.branch_id is not None:
            employee_query = employee_query.where(
                or_(
                    Employee.branch_id == payroll_run.branch_id,
                    Employee.branch_id.is_(None),
                )
            )

        result = await self.db.execute(employee_query)
        employees = list(result.scalars().all())

        # Membersihkan slip lama dari implementasi sebelumnya. Proses ini
        # masih berada di transaksi yang sama sehingga tidak menyisakan
        # payroll setengah jadi ketika terjadi error.
        await self.db.execute(
            delete(PayrollSlip).where(
                PayrollSlip.payroll_run_id == payroll_run.id
            )
        )

        total_gross = Decimal("0.00")
        total_deductions = Decimal("0.00")
        total_tax = Decimal("0.00")
        total_net = Decimal("0.00")

        for employee in employees:
            base_salary = Decimal(employee.base_salary or 0)
            ensure_non_negative(base_salary, field_name="base_salary")

            allowance = Decimal("0.00")
            bonus = Decimal("0.00")
            overtime = Decimal("0.00")
            deduction = Decimal("0.00")
            tax = (base_salary * Decimal("0.05")).quantize(
                Decimal("0.01")
            )
            net_pay = (
                base_salary
                + allowance
                + bonus
                + overtime
                - deduction
                - tax
            )

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

        await commit_or_raise(self.db)
        await self.db.refresh(payroll_run)
        return payroll_run

    async def create_finance_transaction(self, payroll_run_id: UUID):
        payroll_run = await self._get_locked_payroll_run(payroll_run_id)

        if payroll_run is None:
            return None

        if payroll_run.finance_transaction_id is not None:
            return payroll_run

        if payroll_run.status not in {
            PayrollStatus.CALCULATED,
            PayrollStatus.APPROVED,
            PayrollStatus.PAID,
        }:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Payroll must be calculated before finance posting",
            )

        ensure_non_negative(
            Decimal(payroll_run.total_net or 0),
            field_name="total_net",
        )

        existing_result = await self.db.execute(
            select(FinanceTransaction).where(
                FinanceTransaction.company_id == payroll_run.company_id,
                or_(
                    FinanceTransaction.id == payroll_run.finance_transaction_id,
                    (
                        (FinanceTransaction.source_module == "hr_payroll")
                        & (FinanceTransaction.source_id == payroll_run.id)
                    ),
                    FinanceTransaction.transaction_no
                    == f"PAYROLL-{payroll_run.payroll_no}",
                ),
            )
        )
        existing_transaction = existing_result.scalars().first()

        if existing_transaction is not None:
            payroll_run.finance_transaction_id = existing_transaction.id
            await commit_or_raise(self.db)
            await self.db.refresh(payroll_run)
            return payroll_run

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
        await flush_or_raise(self.db)
        payroll_run.finance_transaction_id = transaction.id

        await commit_or_raise(self.db)
        await self.db.refresh(payroll_run)
        return payroll_run
