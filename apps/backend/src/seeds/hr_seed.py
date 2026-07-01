from __future__ import annotations

from datetime import date, datetime, time, timedelta

from sqlalchemy.ext.asyncio import AsyncSession

from src.modules.hr.model_hr import (
    AttendanceRecord,
    AttendanceStatus,
    Employee,
    EmployeeStatus,
    EmploymentType,
    LeaveBalance,
    LeaveType,
)
from src.seeds.context import CompanySeedContext
from src.seeds.data import LEAVE_TYPES, USERS
from src.seeds.utils import D, add_many_if_missing, sid


async def seed_hr(
    db: AsyncSession,
    contexts: dict[str, CompanySeedContext],
):
    for ctx in contexts.values():
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
                    full_name=user["full_name"],
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

        for user in USERS:
            user_key = user["key"]
            employee_id = ctx.employee_ids[user_key]

            for offset in range(1, 4):
                attendance_date = date.today() - timedelta(days=offset)

                attendance_records.append(
                    AttendanceRecord(
                        id=sid(f"attendance:{ctx.code}:{user_key}:{attendance_date.isoformat()}"),
                        company_id=ctx.company_id,
                        branch_id=ctx.branch_ids[user["default_branch"]],
                        employee_id=employee_id,
                        attendance_date=attendance_date,
                        check_in_at=datetime.combine(attendance_date, time(8, 0)),
                        check_out_at=datetime.combine(attendance_date, time(17, 0)),
                        status=AttendanceStatus.PRESENT,
                        work_minutes=540,
                        overtime_minutes=0,
                        notes="Sample attendance seed",
                    )
                )

            for leave_key, _, _, days, _ in LEAVE_TYPES:
                leave_balances.append(
                    LeaveBalance(
                        id=sid(f"leave-balance:{ctx.code}:{user_key}:{leave_key}:2026"),
                        employee_id=employee_id,
                        leave_type_id=ctx.leave_type_ids[leave_key],
                        year=2026,
                        entitled_days=D(days),
                        used_days=D("0"),
                        remaining_days=D(days),
                    )
                )

        await add_many_if_missing(db, attendance_records)
        await add_many_if_missing(db, leave_balances)

    await db.flush()