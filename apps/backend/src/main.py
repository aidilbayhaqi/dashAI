import asyncio
import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from src.core.config import settings
from src.core.redis import check_redis_connection, close_redis_connection
from src.db.database import check_database_connection, engine
from src.ai.route_ai import router as ai_router
from src.modules.admin.route_admin import router as admin_router
from src.modules.automation.outbox_worker import start_outbox_worker
from src.modules.automation.route_automation import router as automation_router
from src.modules.auth.route_auth import router as auth_router
from src.modules.company.route_company import router as company_router
from src.modules.crm.route_crm import router as crm_router
from src.modules.dashboard.route_dashboard import router as dashboard_router
from src.modules.files.route_file import router as file_router
from src.modules.finance.route_finance import router as finance_router
from src.modules.hr.route_hr import router as hr_router
from src.modules.products.route_product import router as product_router
from src.modules.users.route_user import router as user_router
from src.realtime.listener import start_realtime_listener
from src.realtime.router_realtime import router as realtime_router


logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL),
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
)

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    realtime_task: asyncio.Task | None = None
    outbox_task: asyncio.Task | None = None

    logger.info(
        "Starting %s in %s mode",
        settings.APP_NAME,
        settings.ENVIRONMENT,
    )

    if settings.ENABLE_REALTIME_LISTENER:
        realtime_task = asyncio.create_task(start_realtime_listener())
        logger.info("Realtime listener task started")

    if settings.ENABLE_OUTBOX_WORKER:
        outbox_task = asyncio.create_task(start_outbox_worker())
        logger.info("Domain event outbox task started")

    try:
        yield

    finally:
        logger.info("Shutting down %s", settings.APP_NAME)

        tasks = [task for task in (realtime_task, outbox_task) if task]
        for task in tasks:
            task.cancel()
        for task in tasks:
            try:
                await task
            except asyncio.CancelledError:
                pass

        await close_redis_connection()
        await engine.dispose()

        logger.info("Application shutdown completed")


def register_public_uploads(app: FastAPI) -> None:
    """
    Expose only files explicitly classified as public.

    Private files remain outside StaticFiles and must be downloaded through
    /api/v1/files/private/... where authentication and tenant checks apply.
    """

    public_upload_dir = Path(settings.UPLOAD_DIR) / "public"
    public_upload_dir.mkdir(parents=True, exist_ok=True)

    public_upload_url = (
        f"{settings.UPLOAD_URL_PREFIX.rstrip('/')}/public"
    )

    app.mount(
        public_upload_url,
        StaticFiles(directory=public_upload_dir),
        name="public-uploads",
    )


def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.APP_NAME,
        version=settings.APP_VERSION,
        debug=settings.DEBUG,
        lifespan=lifespan,
        docs_url=settings.docs_url,
        redoc_url=settings.redoc_url,
        openapi_url=settings.openapi_url,
    )

    register_public_uploads(app)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins_list,
        allow_credentials=settings.CORS_ALLOW_CREDENTIALS,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=[
            "Authorization",
            "Content-Type",
            "Accept",
            "Origin",
            "X-Requested-With",
            "Idempotency-Key",
        ],
    )

    register_routes(app)
    register_health_routes(app)

    return app


def register_routes(app: FastAPI) -> None:
    app.include_router(auth_router, prefix=settings.API_PREFIX)
    app.include_router(company_router, prefix=settings.API_PREFIX)
    app.include_router(user_router, prefix=settings.API_PREFIX)
    app.include_router(product_router, prefix=settings.API_PREFIX)
    app.include_router(hr_router, prefix=settings.API_PREFIX)
    app.include_router(crm_router, prefix=settings.API_PREFIX)
    app.include_router(finance_router, prefix=settings.API_PREFIX)
    app.include_router(file_router, prefix=settings.API_PREFIX)
    app.include_router(admin_router, prefix=settings.API_PREFIX)
    app.include_router(automation_router, prefix=settings.API_PREFIX)
    app.include_router(dashboard_router, prefix=settings.API_PREFIX)
    app.include_router(ai_router, prefix=settings.API_PREFIX)

    app.include_router(realtime_router)


def register_health_routes(app: FastAPI) -> None:
    @app.get("/")
    async def root():
        return {
            "message": "DashAI ERP API is running",
            "app": settings.APP_NAME,
            "version": settings.APP_VERSION,
            "environment": settings.ENVIRONMENT,
            "docs": settings.docs_url,
        }

    @app.get("/health")
    async def health_check():
        return {
            "status": "ok",
            "app": settings.APP_NAME,
            "version": settings.APP_VERSION,
            "environment": settings.ENVIRONMENT,
        }

    @app.get("/health/db")
    async def health_database():
        try:
            result = await check_database_connection()
        except Exception:
            logger.exception("Database health check failed")
            result = False

        payload = {
            "database": "connected" if result else "disconnected",
            "result": result,
        }

        if not result:
            return JSONResponse(status_code=503, content=payload)

        return payload

    @app.get("/health/redis")
    async def health_redis():
        try:
            result = await check_redis_connection()
        except Exception:
            logger.exception("Redis health check failed")
            result = False

        payload = {
            "redis": "connected" if result else "disconnected",
            "result": result,
        }

        if not result:
            return JSONResponse(status_code=503, content=payload)

        return payload

    @app.get("/ready")
    async def readiness_check():
        db_ok = False
        redis_ok = False

        try:
            db_ok = await check_database_connection()
        except Exception:
            logger.exception("Readiness database check failed")

        try:
            redis_ok = await check_redis_connection()
        except Exception:
            logger.exception("Readiness redis check failed")

        is_ready = db_ok and redis_ok
        payload = {
            "status": "ready" if is_ready else "not_ready",
            "database": db_ok,
            "redis": redis_ok,
        }

        return JSONResponse(
            status_code=200 if is_ready else 503,
            content=payload,
        )


app = create_app()
