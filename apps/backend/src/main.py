import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.core.config import settings
from src.core.redis import check_redis_connection, close_redis_connection
from src.db.database import check_database_connection, engine

from src.modules.auth.route_auth import router as auth_router
from src.modules.company.route_company import router as company_router
from src.modules.users.route_user import router as user_router
from src.modules.products.route_product import router as product_router
from src.modules.hr.route_hr import router as hr_router
from src.modules.crm.route_crm import router as crm_router
from src.modules.finance.route_finance import router as finance_router

try:
    from src.modules.dashboard.route_dashboard import router as dashboard_router
except Exception:
    dashboard_router = None

from src.realtime.listener import start_realtime_listener
from src.realtime.router_realtime import router as realtime_router

from pathlib import Path
from fastapi.staticfiles import StaticFiles
from src.modules.files.route_file import router as file_router
from src.modules.admin.route_admin import router as admin_router


logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL),
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
)

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    realtime_task: asyncio.Task | None = None

    logger.info(
        "Starting %s in %s mode",
        settings.APP_NAME,
        settings.ENVIRONMENT,
    )

    if settings.ENABLE_REALTIME_LISTENER:
        realtime_task = asyncio.create_task(start_realtime_listener())
        logger.info("Realtime listener task started")

    try:
        yield

    finally:
        logger.info("Shutting down %s", settings.APP_NAME)

        if realtime_task:
            realtime_task.cancel()

            try:
                await realtime_task
            except asyncio.CancelledError:
                logger.info("Realtime listener task stopped")

        await close_redis_connection()
        await engine.dispose()

        logger.info("Application shutdown completed")


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

    Path(settings.UPLOAD_DIR).mkdir(parents=True, exist_ok=True)

    app.mount(
        settings.UPLOAD_URL_PREFIX,
        StaticFiles(directory=settings.UPLOAD_DIR),
        name="uploads",
    )

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

    if dashboard_router is not None:
        app.include_router(dashboard_router, prefix=settings.API_PREFIX)

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

        except Exception as exc:
            logger.exception("Database health check failed")

            return {
                "database": "disconnected",
                "result": False,
                "error": str(exc),
            }

        return {
            "database": "connected" if result else "disconnected",
            "result": result,
        }

    @app.get("/health/redis")
    async def health_redis():
        result = await check_redis_connection()

        return {
            "redis": "connected" if result else "disconnected",
            "result": result,
        }

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

        return {
            "status": "ready" if is_ready else "not_ready",
            "database": db_ok,
            "redis": redis_ok,
        }


app = create_app()