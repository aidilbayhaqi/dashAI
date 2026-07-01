from datetime import date, datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel

from src.modules.hr.model_hr import (
    ApprovalStatus,
    AttendanceStatus,
    EmployeeStatus,
    EmploymentType,
    PayrollStatus,
    TaskStatus,
)


class ORMBase(BaseModel):
    model_config = {"from_attributes": True}


class EmployeeCreate(BaseModel):
    company_id: UUID
    branch_id: UUID | None = None
    user_id: UUID | None = None
    employee_no: str
    full_name: str
    email: str | None = None
    phone: str | None = None
    department_name: str | None = None
    job_title: str | None = None
    employment_type: EmploymentType = EmploymentType.FULL_TIME
    status: EmployeeStatus = EmployeeStatus.ACTIVE
    hire_date: date | None = None
    resign_date: date | None = None
    base_salary: Decimal = Decimal("0.00")


class EmployeeUpdate(BaseModel):
    branch_id: UUID | None = None
    user_id: UUID | None = None
    employee_no: str | None = None
    full_name: str | None = None
    email: str | None = None
    phone: str | None = None
    department_name: str | None = None
    job_title: str | None = None
    employment_type: EmploymentType | None = None
    status: EmployeeStatus | None = None
    hire_date: date | None = None
    resign_date: date | None = None
    base_salary: Decimal | None = None


class EmployeeResponse(EmployeeCreate, ORMBase):
    id: UUID
    created_at: datetime
    updated_at: datetime


class AttendanceCreate(BaseModel):
    company_id: UUID
    branch_id: UUID | None = None
    employee_id: UUID
    attendance_date: date
    check_in_at: datetime | None = None
    check_out_at: datetime | None = None
    status: AttendanceStatus = AttendanceStatus.PRESENT
    work_minutes: int = 0
    overtime_minutes: int = 0
    notes: str | None = None


class AttendanceUpdate(BaseModel):
    check_in_at: datetime | None = None
    check_out_at: datetime | None = None
    status: AttendanceStatus | None = None
    work_minutes: int | None = None
    overtime_minutes: int | None = None
    notes: str | None = None


class AttendanceResponse(AttendanceCreate, ORMBase):
    id: UUID


class LeaveTypeCreate(BaseModel):
    company_id: UUID
    code: str
    name: str
    default_days_per_year: Decimal = Decimal("12.00")
    is_paid: bool = True
    is_active: bool = True


class LeaveTypeResponse(LeaveTypeCreate, ORMBase):
    id: UUID


class LeaveRequestCreate(BaseModel):
    company_id: UUID
    branch_id: UUID | None = None
    employee_id: UUID
    leave_type_id: UUID
    start_date: date
    end_date: date
    total_days: Decimal
    reason: str | None = None


class LeaveRequestUpdate(BaseModel):
    status: ApprovalStatus | None = None
    approved_by_id: UUID | None = None
    approved_at: datetime | None = None
    reason: str | None = None


class LeaveRequestResponse(LeaveRequestCreate, ORMBase):
    id: UUID
    status: ApprovalStatus
    approved_by_id: UUID | None
    created_at: datetime
    approved_at: datetime | None


class HRTaskCreate(BaseModel):
    company_id: UUID
    branch_id: UUID | None = None
    employee_id: UUID | None = None
    assigned_by_id: UUID | None = None
    title: str
    description: str | None = None
    priority: str | None = None
    due_date: date | None = None
    weight_score: Decimal = Decimal("0.00")


class HRTaskUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    status: TaskStatus | None = None
    priority: str | None = None
    due_date: date | None = None
    completion_score: Decimal | None = None


class HRTaskResponse(HRTaskCreate, ORMBase):
    id: UUID
    status: TaskStatus
    completion_score: Decimal
    created_at: datetime
    updated_at: datetime


class PayrollRunCreate(BaseModel):
    company_id: UUID
    branch_id: UUID | None = None
    created_by_id: UUID | None = None
    payroll_no: str
    period_start: date
    period_end: date


class PayrollRunResponse(PayrollRunCreate, ORMBase):
    id: UUID
    status: PayrollStatus
    total_gross: Decimal
    total_deductions: Decimal
    total_tax: Decimal
    total_net: Decimal
    finance_transaction_id: UUID | None
    created_at: datetime
    paid_at: datetime | None