from __future__ import annotations

from datetime import date, datetime, time, timedelta

from sqlalchemy.ext.asyncio import AsyncSession

from src.modules.hr.model_hr import (
    AttendanceRecord,
    AttendanceStatus,
    Employee,
    EmployeeStatus,
    EmploymentType,
    HRTask,
    LeaveBalance,
    LeaveRequest,
    LeaveType,
    PayrollRun,
    PayrollSlip,
    PayrollStatus,
    TaskStatus,
)
from src.seeds.context import CompanySeedContext
from src.seeds.data import COMPANY_LABELS, LEAVE_TYPES, USERS
from src.seeds.utils import D, add_many_if_missing, sid


async def seed_hr(
    db: AsyncSession,
    contexts: dict[str, CompanySeedContext],
):
    for ctx in contexts.values():
        company_label = COMPANY_LABELS.get(ctx.code, ctx.code.upper())

        employees = []

        for idx, user in enumerate(USERS, start=1):
            user_key = user["key"]

            employees.append(
                Employee(
                    id=ctx.employee_ids[user_key],
                    company_id=ctx.company_id,
                    branch_id=ctx.branch_ids[user["default_branch"]],
                    user_id=ctx.user_ids[user_key],
                    employee_no=f"{ctx.code.upper()}-EMP-{idx:04d}",
                    full_name=user["full_name"].format(
                        company=ctx.code,
                        company_label=company_label,
                    ),
                    email=user["email"].format(company=ctx.code),
                    phone=user["phone"],
                    department_name=user["department_name"],
                    job_title=user["job_title"],
                    employment_type=EmploymentType.FULL_TIME,
                    status=EmployeeStatus.ACTIVE,
                    hire_date=date(2024, min(idx, 12), min(idx + 1, 28)),
                    resign_date=None,
                    base_salary=D("7000000") + (D(idx) * D("750000")),
                )
            )

        await add_many_if_missing(db, employees)
        await db.flush()

        leave_types = []

        for key, code, name, days, is_paid in LEAVE_TYPES:
            leave_types.append(
                LeaveType(
                    id=ctx.leave_type_ids[key],
                    company_id=ctx.company_id,
                    code=code,
                    name=name,
                    default_days_per_year=D(days),
                    is_paid=is_paid,
                    is_active=True,
                )
            )

        await add_many_if_missing(db, leave_types)
        await db.flush()

        attendance_records = []
        leave_balances = []
        leave_requests = []
        tasks = []

        for index, user in enumerate(USERS, start=1):
            user_key = user["key"]
            employee_id = ctx.employee_ids[user_key]

            for offset in range(1, 5):
                attendance_date = date.today() - timedelta(days=offset)

                if user_key == "sales" and offset == 1:
                    attendance_status = AttendanceStatus.LATE
                    check_in = time(8, 45)
                    notes = f"{company_label} sales terlambat karena visit customer pagi."
                elif user_key == "warehouse" and offset == 2:
                    attendance_status = AttendanceStatus.PRESENT
                    check_in = time(7, 45)
                    notes = f"{company_label} warehouse opening stock check."
                else:
                    attendance_status = AttendanceStatus.PRESENT
                    check_in = time(8, 0)
                    notes = f"{company_label} attendance seed."

                attendance_records.append(
                    AttendanceRecord(
                        id=sid(f"attendance:{ctx.code}:{user_key}:{attendance_date.isoformat()}"),
                        company_id=ctx.company_id,
                        branch_id=ctx.branch_ids[user["default_branch"]],
                        employee_id=employee_id,
                        attendance_date=attendance_date,
                        check_in_at=datetime.combine(attendance_date, check_in),
                        check_out_at=datetime.combine(attendance_date, time(17, 0)),
                        status=attendance_status,
                        work_minutes=495 if attendance_status == AttendanceStatus.LATE else 540,
                        overtime_minutes=60 if user_key == "warehouse" and offset == 2 else 0,
                        notes=notes,
                    )
                )

            for leave_key, _, _, days, _ in LEAVE_TYPES:
                used_days = D("1.00") if leave_key == "annual" and user_key in {"sales", "warehouse"} else D("0.00")

                leave_balances.append(
                    LeaveBalance(
                        id=sid(f"leave-balance:{ctx.code}:{user_key}:{leave_key}:2026"),
                        employee_id=employee_id,
                        leave_type_id=ctx.leave_type_ids[leave_key],
                        year=2026,
                        entitled_days=D(days),
                        used_days=used_days,
                        remaining_days=D(days) - used_days,
                    )
                )

            if user_key in {"sales", "warehouse"}:
                leave_requests.append(
                    LeaveRequest(
                        id=sid(f"leave-request:{ctx.code}:{user_key}:annual-2026"),
                        company_id=ctx.company_id,
                        branch_id=ctx.branch_ids[user["default_branch"]],
                        employee_id=employee_id,
                        leave_type_id=ctx.leave_type_ids["annual"],
                        approved_by_id=ctx.user_ids["hr"],
                        start_date=date(2026, 7, 8 + index),
                        end_date=date(2026, 7, 8 + index),
                        total_days=D("1.00"),
                        status="approved",
                        reason=f"Cuti tahunan {company_label}",
                        approved_at=datetime(2026, 7, 1, 10, 0),
                    )
                )

            if user_key in {"sales", "warehouse", "finance"}:
                tasks.append(
                    HRTask(
                        id=sid(f"hr-task:{ctx.code}:{user_key}:monthly-target"),
                        company_id=ctx.company_id,
                        branch_id=ctx.branch_ids[user["default_branch"]],
                        employee_id=employee_id,
                        assigned_by_id=ctx.user_ids["admin"],
                        title=f"{company_label} Monthly Target - {user['job_title']}",
                        description=f"Target bulanan khusus company {company_label}",
                        status=TaskStatus.IN_PROGRESS if user_key != "finance" else TaskStatus.DONE,
                        priority="high" if user_key == "sales" else "medium",
                        due_date=date(2026, 7, 30),
                        weight_score=D("100.00"),
                        completion_score=D("72.00") if user_key != "finance" else D("95.00"),
                    )
                )

        await add_many_if_missing(db, attendance_records)
        await add_many_if_missing(db, leave_balances)
        await add_many_if_missing(db, leave_requests)
        await add_many_if_missing(db, tasks)
        await db.flush()

        payroll_run_id = sid(f"payroll-run:{ctx.code}:2026-06")

        total_gross = D("0.00")
        total_deductions = D("0.00")
        total_tax = D("0.00")
        total_net = D("0.00")

        slips = []

        for user in USERS:
            user_key = user["key"]
            base_salary = D("7500000") if user_key != "owner" else D("15000000")
            allowance = D("1000000") if user_key in {"sales", "warehouse"} else D("750000")
            bonus = D("500000") if user_key == "sales" else D("0")
            deduction = D("150000")
            tax = D("250000")
            net_pay = base_salary + allowance + bonus - deduction - tax

            total_gross += base_salary + allowance + bonus
            total_deductions += deduction
            total_tax += tax
            total_net += net_pay

            slips.append(
                PayrollSlip(
                    id=sid(f"payroll-slip:{ctx.code}:2026-06:{user_key}"),
                    payroll_run_id=payroll_run_id,
                    employee_id=ctx.employee_ids[user_key],
                    base_salary=base_salary,
                    allowance_amount=allowance,
                    bonus_amount=bonus,
                    overtime_amount=D("0"),
                    deduction_amount=deduction,
                    tax_amount=tax,
                    net_pay=net_pay,
                )
            )

        await add_many_if_missing(
            db,
            [
                PayrollRun(
                    id=payroll_run_id,
                    company_id=ctx.company_id,
                    branch_id=ctx.branch_ids["hq"],
                    created_by_id=ctx.user_ids["finance"],
                    payroll_no=f"PAY-{ctx.code.upper()}-2026-06",
                    period_start=date(2026, 6, 1),
                    period_end=date(2026, 6, 30),
                    status=PayrollStatus.PAID,
                    total_gross=total_gross,
                    total_deductions=total_deductions,
                    total_tax=total_tax,
                    total_net=total_net,
                    finance_transaction_id=None,
                    paid_at=datetime(2026, 6, 30, 15, 0),
                )
            ],
        )

        await db.flush()
        await add_many_if_missing(db, slips)

    await db.flush()