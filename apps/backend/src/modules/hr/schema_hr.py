from datetime import date, datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, field_validator, model_validator

from src.modules.hr.model_hr import (
    ApprovalStatus,
    AttendanceStatus,
    EmployeeStatus,
    EmploymentType,
    PayrollStatus,
    TaskStatus,
    KPIIndicator,
    KPIReview,
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
    photo_url: str | None = None
    department_name: str | None = None
    job_title: str | None = None
    employment_type: EmploymentType = EmploymentType.FULL_TIME
    status: EmployeeStatus = EmployeeStatus.ACTIVE
    hire_date: date | None = None
    resign_date: date | None = None
    base_salary: Decimal = Decimal("0.00")

    @model_validator(mode="after")
    def validate_employee_values(self):
        if self.base_salary < 0:
            raise ValueError("Base salary cannot be negative")
        if (
            self.hire_date is not None
            and self.resign_date is not None
            and self.resign_date < self.hire_date
        ):
            raise ValueError("Resign date cannot be earlier than hire date")
        return self


class EmployeeUpdate(BaseModel):
    branch_id: UUID | None = None
    user_id: UUID | None = None
    employee_no: str | None = None
    full_name: str | None = None
    email: str | None = None
    phone: str | None = None
    photo_url: str | None = None
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

    @model_validator(mode="after")
    def validate_attendance_values(self):
        if self.work_minutes < 0 or self.overtime_minutes < 0:
            raise ValueError("Attendance minutes cannot be negative")
        if (
            self.check_in_at is not None
            and self.check_out_at is not None
            and self.check_out_at < self.check_in_at
        ):
            raise ValueError("Check-out cannot be earlier than check-in")
        return self


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

    @model_validator(mode="after")
    def validate_default_days(self):
        if self.default_days_per_year < 0:
            raise ValueError("Default leave days cannot be negative")
        return self


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

    @model_validator(mode="after")
    def validate_leave_request(self):
        if self.end_date < self.start_date:
            raise ValueError("End date cannot be earlier than start date")
        if self.total_days <= 0:
            raise ValueError("Total leave days must be greater than zero")
        return self


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

    status: PayrollStatus = PayrollStatus.DRAFT

    total_gross: Decimal = Decimal("0.00")
    total_deductions: Decimal = Decimal("0.00")
    total_tax: Decimal = Decimal("0.00")
    total_net: Decimal = Decimal("0.00")

    @model_validator(mode="after")
    def validate_payroll_values(self):
        if self.period_end < self.period_start:
            raise ValueError("Payroll period end cannot precede period start")
        totals = (
            self.total_gross,
            self.total_deductions,
            self.total_tax,
            self.total_net,
        )
        if any(value < 0 for value in totals):
            raise ValueError("Payroll amounts cannot be negative")
        if self.total_net > self.total_gross:
            raise ValueError("Payroll net cannot exceed gross amount")
        return self


class PayrollRunUpdate(BaseModel):
    branch_id: UUID | None = None

    payroll_no: str | None = None
    period_start: date | None = None
    period_end: date | None = None

    status: PayrollStatus | None = None

    total_gross: Decimal | None = None
    total_deductions: Decimal | None = None
    total_tax: Decimal | None = None
    total_net: Decimal | None = None

    paid_at: datetime | None = None


class PayrollRunResponse(PayrollRunCreate, ORMBase):
    id: UUID
    finance_transaction_id: UUID | None = None
    created_at: datetime
    paid_at: datetime | None = None

class KPIIndicatorCreate(BaseModel):
    company_id: UUID
    branch_id: UUID | None = None
    code: str
    name: str
    category: str | None = None
    weight_percent: Decimal = Decimal("0.0000")
    target_value: Decimal = Decimal("0.0000")
    is_active: bool = True

    @model_validator(mode="after")
    def validate_kpi_indicator(self):
        if self.weight_percent < 0 or self.weight_percent > 100:
            raise ValueError("KPI weight must be between 0 and 100")
        return self


class KPIIndicatorUpdate(BaseModel):
    branch_id: UUID | None = None
    code: str | None = None
    name: str | None = None
    category: str | None = None
    weight_percent: Decimal | None = None
    target_value: Decimal | None = None
    is_active: bool | None = None


class KPIIndicatorResponse(KPIIndicatorCreate, ORMBase):
    id: UUID


class KPIReviewCreate(BaseModel):
    company_id: UUID
    branch_id: UUID | None = None
    employee_id: UUID
    reviewer_user_id: UUID | None = None
    period_start: date
    period_end: date
    total_score: Decimal = Decimal("0.0000")
    rating: str | None = None
    status: ApprovalStatus = ApprovalStatus.DRAFT

    @field_validator("rating")
    @classmethod
    def normalize_rating(cls, value: str | None):
        if value is None:
            return None
        normalized = value.strip().upper()
        return normalized or None

    @model_validator(mode="after")
    def validate_kpi_review(self):
        if self.period_end < self.period_start:
            raise ValueError("KPI period end cannot precede period start")
        if self.total_score < 0 or self.total_score > 100:
            raise ValueError("KPI total score must be between 0 and 100")
        return self


class KPIReviewUpdate(BaseModel):
    branch_id: UUID | None = None
    reviewer_user_id: UUID | None = None
    period_start: date | None = None
    period_end: date | None = None
    total_score: Decimal | None = None
    rating: str | None = None
    status: ApprovalStatus | None = None


class KPIReviewResponse(KPIReviewCreate, ORMBase):
    id: UUID
    created_at: datetime