from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession

from src.db.database import get_db
from src.routes.crud_factory import create_crud_router
from src.modules.hr.model_hr import (
    AttendanceRecord,
    Employee,
    HRTask,
    LeaveRequest,
    LeaveType,
    PayrollRun,
    KPIIndicator,
    KPIReview,
)
from src.modules.hr.schema_hr import (
    AttendanceCreate,
    AttendanceUpdate,
    AttendanceResponse,
    EmployeeCreate,
    EmployeeUpdate,
    EmployeeResponse,
    HRTaskCreate,
    HRTaskUpdate,
    HRTaskResponse,
    LeaveRequestCreate,
    LeaveRequestUpdate,
    LeaveRequestResponse,
    LeaveTypeCreate,
    LeaveTypeResponse,
    PayrollRunCreate,
    PayrollRunUpdate,
    PayrollRunResponse,
    PayrollPaymentRequest,
    KPIIndicatorCreate,
    KPIIndicatorUpdate,
    KPIIndicatorResponse,
    KPIReviewCreate,
    KPIReviewUpdate,
    KPIReviewResponse,
)
from src.modules.hr.policy_hr import PayrollRunWritePolicy
from src.modules.hr.service_hr import PayrollRunService
from src.security.dependencies import CurrentUser, require_permission
from src.security.idempotency import (
    build_idempotency_context,
    execute_idempotent,
    get_idempotency_key,
)
from src.security.tenant import ensure_item_access, get_record_or_404


router = APIRouter(tags=["HR & KPI"])


router.include_router(
    create_crud_router(
        prefix="/hr/employees",
        tags=["HR Employees"],
        permission_prefix="hr.employees",
        model_class=Employee,
        create_schema=EmployeeCreate,
        update_schema=EmployeeUpdate,
        response_schema=EmployeeResponse,
        search_fields=[
            "employee_no",
            "full_name",
            "email",
            "phone",
            "department_name",
            "job_title",
        ],
    )
)

router.include_router(
    create_crud_router(
        prefix="/hr/attendance",
        tags=["HR Attendance"],
        permission_prefix="hr.attendance",
        model_class=AttendanceRecord,
        create_schema=AttendanceCreate,
        update_schema=AttendanceUpdate,
        response_schema=AttendanceResponse,
        search_fields=["notes"],
        date_filter_field="attendance_date",
    )
)

router.include_router(
    create_crud_router(
        prefix="/hr/leave-types",
        tags=["HR Leave Types"],
        permission_prefix="hr.leave",
        model_class=LeaveType,
        create_schema=LeaveTypeCreate,
        update_schema=LeaveTypeCreate,
        response_schema=LeaveTypeResponse,
        search_fields=["code", "name", "description"],
    )
)

router.include_router(
    create_crud_router(
        prefix="/hr/leave-requests",
        tags=["HR Leave Requests"],
        permission_prefix="hr.leave",
        model_class=LeaveRequest,
        create_schema=LeaveRequestCreate,
        update_schema=LeaveRequestUpdate,
        response_schema=LeaveRequestResponse,
        search_fields=["reason", "approval_notes"],
        date_filter_field="start_date",
    )
)

router.include_router(
    create_crud_router(
        prefix="/hr/tasks",
        tags=["HR Tasks"],
        permission_prefix="hr.tasks",
        model_class=HRTask,
        create_schema=HRTaskCreate,
        update_schema=HRTaskUpdate,
        response_schema=HRTaskResponse,
        search_fields=["title", "description"],
        date_filter_field="due_date",
    )
)

router.include_router(
    create_crud_router(
        prefix="/hr/payroll-runs",
        tags=["HR Payroll"],
        permission_prefix="hr.payroll",
        model_class=PayrollRun,
        create_schema=PayrollRunCreate,
        update_schema=PayrollRunUpdate,
        response_schema=PayrollRunResponse,
        search_fields=["payroll_no"],
        date_filter_field="period_start",
        write_policy=PayrollRunWritePolicy(),
    )
)

router.include_router(
    create_crud_router(
        prefix="/hr/kpi-indicators",
        tags=["HR KPI Indicators"],
        permission_prefix="hr.kpi",
        model_class=KPIIndicator,
        create_schema=KPIIndicatorCreate,
        update_schema=KPIIndicatorUpdate,
        response_schema=KPIIndicatorResponse,
        search_fields=["code", "name", "category"],
    )
)

router.include_router(
    create_crud_router(
        prefix="/hr/kpi-reviews",
        tags=["HR KPI Reviews"],
        permission_prefix="hr.kpi",
        model_class=KPIReview,
        create_schema=KPIReviewCreate,
        update_schema=KPIReviewUpdate,
        response_schema=KPIReviewResponse,
        search_fields=["rating"],
        date_filter_field="period_start",
    )
)


@router.post(
    "/hr/payroll-runs/{payroll_run_id}/calculate",
    response_model=PayrollRunResponse,
)
async def calculate_payroll(
    payroll_run_id: UUID,
    request: Request,
    idempotency_key: str = Depends(get_idempotency_key),
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(
        require_permission("hr.payroll.manage")
    ),
):
    context = await build_idempotency_context(
        request=request,
        current_user=current_user,
        raw_key=idempotency_key,
    )

    async def operation():
        payroll_run = await get_record_or_404(
            db=db,
            model_class=PayrollRun,
            item_id=payroll_run_id,
            detail="Payroll run not found",
        )

        await ensure_item_access(
            db=db,
            item=payroll_run,
            current_user=current_user,
            detail="Payroll run not found",
        )

        service = PayrollRunService(db)
        result = await service.calculate_payroll(payroll_run.id)

        if result is None:
            raise HTTPException(
                status_code=404,
                detail="Payroll run not found",
            )
        return result

    return await execute_idempotent(
        context=context,
        operation=operation,
        response_model=PayrollRunResponse,
    )


@router.post(
    "/hr/payroll-runs/{payroll_run_id}/create-finance-transaction",
    response_model=PayrollRunResponse,
)
async def create_payroll_finance_transaction(
    payroll_run_id: UUID,
    request: Request,
    idempotency_key: str = Depends(get_idempotency_key),
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(
        require_permission("hr.payroll.manage")
    ),
):
    context = await build_idempotency_context(
        request=request,
        current_user=current_user,
        raw_key=idempotency_key,
    )

    async def operation():
        payroll_run = await get_record_or_404(
            db=db,
            model_class=PayrollRun,
            item_id=payroll_run_id,
            detail="Payroll run not found",
        )

        await ensure_item_access(
            db=db,
            item=payroll_run,
            current_user=current_user,
            detail="Payroll run not found",
        )

        service = PayrollRunService(db)
        result = await service.create_finance_transaction(payroll_run.id)

        if result is None:
            raise HTTPException(
                status_code=404,
                detail="Payroll run not found",
            )
        return result

    return await execute_idempotent(
        context=context,
        operation=operation,
        response_model=PayrollRunResponse,
    )

@router.post(
    "/hr/payroll-runs/{payroll_run_id}/pay",
    response_model=PayrollRunResponse,
)
async def pay_payroll_run(
    payroll_run_id: UUID,
    payload: PayrollPaymentRequest,
    request: Request,
    idempotency_key: str = Depends(get_idempotency_key),
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(
        require_permission("hr.payroll.manage")
    ),
):
    context = await build_idempotency_context(
        request=request,
        current_user=current_user,
        raw_key=idempotency_key,
    )

    async def operation():
        payroll_run = await get_record_or_404(
            db=db,
            model_class=PayrollRun,
            item_id=payroll_run_id,
            detail="Payroll run not found",
        )
        await ensure_item_access(
            db=db,
            item=payroll_run,
            current_user=current_user,
            detail="Payroll run not found",
        )
        service = PayrollRunService(db)
        result = await service.pay_payroll(
            payroll_run_id=payroll_run.id,
            user_id=current_user.user_id,
            payload=payload,
        )
        if result is None:
            raise HTTPException(status_code=404, detail="Payroll run not found")
        return result

    return await execute_idempotent(
        context=context,
        operation=operation,
        response_model=PayrollRunResponse,
    )
