from fastapi import APIRouter

from src.modules.admin.model_admin import SystemSetting
from src.modules.admin.schema_admin import (
    SystemSettingCreate,
    SystemSettingResponse,
    SystemSettingUpdate,
)
from src.routes.crud_factory import create_crud_router


router = APIRouter(tags=["Admin"])


router.include_router(
    create_crud_router(
        prefix="/admin/settings",
        tags=["Admin Settings"],
        permission_prefix="admin.settings",
        model_class=SystemSetting,
        create_schema=SystemSettingCreate,
        update_schema=SystemSettingUpdate,
        response_schema=SystemSettingResponse,
        search_fields=["key", "category", "value"],
    )
)