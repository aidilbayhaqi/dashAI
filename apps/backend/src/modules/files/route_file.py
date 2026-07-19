from __future__ import annotations

import os
import uuid
from pathlib import Path
from typing import Annotated
from uuid import UUID

import aiofiles
from fastapi import (
    APIRouter,
    Depends,
    File,
    Form,
    HTTPException,
    Path as PathParameter,
    Query,
    UploadFile,
    status,
)
from fastapi.responses import FileResponse

from src.core.config import settings
from src.modules.files.upload_policy import (
    DEFAULT_UPLOAD_CONTEXT,
    get_upload_policy,
    normalize_extension,
    sanitize_filename,
    storage_visibility_folder,
)
from src.security.dependencies import CurrentUser, get_current_user
from src.security.tenant import resolve_company_id


router = APIRouter(
    prefix="/files",
    tags=["Files"],
)


UPLOAD_CHUNK_SIZE = 1024 * 1024
GENERIC_BINARY_CONTENT_TYPE = "application/octet-stream"


def parse_optional_company_id(
    raw_company_id: str | None,
) -> UUID | None:
    if raw_company_id is None:
        return None

    normalized = raw_company_id.strip()

    if not normalized:
        return None

    try:
        return UUID(normalized)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Invalid company_id",
        ) from exc


def build_public_url(
    *,
    folder: str,
    company_id: UUID,
    filename: str,
) -> str:
    return (
        f"{settings.UPLOAD_URL_PREFIX}/public/"
        f"{folder}/{company_id}/{filename}"
    )


def build_private_url(
    *,
    context: str,
    company_id: UUID,
    filename: str,
) -> str:
    return (
        f"{settings.API_PREFIX}/files/private/"
        f"{context}/{company_id}/{filename}"
    )


def validate_content_type(
    *,
    content_type: str | None,
    allowed_content_types: frozenset[str],
) -> None:
    """
    Browser tertentu dapat mengirim application/octet-stream untuk file
    yang sebenarnya valid. Extension tetap diperiksa oleh policy dan MIME
    spesifik ditolak apabila jelas tidak sesuai.
    """

    if not content_type:
        return

    normalized = content_type.split(";", 1)[0].strip().lower()

    if normalized == GENERIC_BINARY_CONTENT_TYPE:
        return

    if normalized not in allowed_content_types:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=f"Content type {normalized} is not allowed for this context",
        )


async def save_upload_stream(
    *,
    upload: UploadFile,
    destination: Path,
) -> int:
    max_size_bytes = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024
    total_size = 0

    try:
        async with aiofiles.open(destination, "wb") as output:
            while True:
                chunk = await upload.read(UPLOAD_CHUNK_SIZE)

                if not chunk:
                    break

                total_size += len(chunk)

                if total_size > max_size_bytes:
                    raise HTTPException(
                        status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                        detail=(
                            "File is too large. Maximum size is "
                            f"{settings.MAX_UPLOAD_SIZE_MB} MB"
                        ),
                    )

                await output.write(chunk)

    except Exception:
        destination.unlink(missing_ok=True)
        raise

    finally:
        await upload.close()

    return total_size


@router.get("/health")
async def files_health():
    upload_root = Path(settings.UPLOAD_DIR).resolve()
    public_root = upload_root / "public"
    public_root.mkdir(parents=True, exist_ok=True)

    return {
        "status": "ok",
        "module": "files",
        "upload_dir": str(upload_root),
        "public_dir": str(public_root),
        "writable": os.access(public_root, os.W_OK),
        "railway_volume_mount_path": os.getenv("RAILWAY_VOLUME_MOUNT_PATH"),
    }


@router.post("/upload")
async def upload_file(
    file: Annotated[UploadFile, File(...)],
    context_form: Annotated[
        str | None,
        Form(alias="context"),
    ] = None,
    company_id_form: Annotated[
        str | None,
        Form(alias="company_id"),
    ] = None,
    context_query: Annotated[
        str | None,
        Query(alias="context"),
    ] = None,
    company_id_query: Annotated[
        str | None,
        Query(alias="company_id"),
    ] = None,
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Upload file terautentikasi dan tenant-aware.

    Request lama tetap kompatibel:
    - context dapat dikirim melalui Form atau Query.
    - company_id dapat dikirim melalui Form atau Query.
    - response tetap menyediakan path, url, dan file_url.
    """

    context = (
        context_form
        or context_query
        or DEFAULT_UPLOAD_CONTEXT
    ).strip()

    policy = get_upload_policy(context)

    if policy is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid upload context: {context}",
        )

    requested_company_id = parse_optional_company_id(
        company_id_form or company_id_query
    )

    company_id = resolve_company_id(
        current_user=current_user,
        requested_company_id=requested_company_id,
        required_for_superuser=True,
    )

    if company_id is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="company_id is required",
        )

    original_name = sanitize_filename(file.filename)
    extension = normalize_extension(original_name)

    if extension not in policy.allowed_extensions:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"File extension {extension or '[none]'} "
                f"is not allowed for context {context}"
            ),
        )

    validate_content_type(
        content_type=file.content_type,
        allowed_content_types=policy.allowed_content_types,
    )

    visibility = storage_visibility_folder(policy)
    upload_dir = (
        Path(settings.UPLOAD_DIR)
        / visibility
        / policy.folder
        / str(company_id)
    )
    upload_dir.mkdir(parents=True, exist_ok=True)

    unique_filename = f"{uuid.uuid4().hex}{extension}"
    file_path = upload_dir / unique_filename

    total_size = await save_upload_stream(
        upload=file,
        destination=file_path,
    )

    if (
        not file_path.is_file()
        or file_path.stat().st_size != total_size
    ):
        file_path.unlink(missing_ok=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=(
                "Upload storage verification failed. Ensure UPLOAD_DIR points "
                "to a writable persistent volume."
            ),
        )

    if policy.is_public:
        access_url = build_public_url(
            folder=policy.folder,
            company_id=company_id,
            filename=unique_filename,
        )
    else:
        access_url = build_private_url(
            context=context,
            company_id=company_id,
            filename=unique_filename,
        )

    return {
        "message": "File uploaded successfully",
        "filename": unique_filename,
        "original_filename": original_name,
        "content_type": file.content_type,
        "size": total_size,
        "context": context,
        "company_id": str(company_id),
        "visibility": visibility,
        "is_public": policy.is_public,
        "path": access_url,
        "url": access_url,
        "file_url": access_url,
    }


@router.get("/private/{context}/{company_id}/{filename}")
async def download_private_file(
    context: Annotated[
        str,
        PathParameter(min_length=1, max_length=64),
    ],
    company_id: UUID,
    filename: Annotated[
        str,
        PathParameter(min_length=1, max_length=255),
    ],
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Mengakses file private melalui endpoint terautentikasi.

    Non-superuser hanya dapat mengakses file milik company yang aktif pada
    session-nya. Superuser dapat mengakses company yang disebut pada URL.
    """

    policy = get_upload_policy(context)

    if policy is None or policy.is_public:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found",
        )

    resolved_company_id = resolve_company_id(
        current_user=current_user,
        requested_company_id=company_id,
        required_for_superuser=True,
    )

    if resolved_company_id is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found",
        )

    safe_filename = sanitize_filename(filename)

    if safe_filename != filename:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found",
        )

    extension = normalize_extension(safe_filename)

    if extension not in policy.allowed_extensions:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found",
        )

    file_path = (
        Path(settings.UPLOAD_DIR)
        / "private"
        / policy.folder
        / str(resolved_company_id)
        / safe_filename
    )

    if not file_path.is_file():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found",
        )

    media_type = next(
        iter(policy.allowed_content_types),
        GENERIC_BINARY_CONTENT_TYPE,
    )

    return FileResponse(
        path=file_path,
        media_type=media_type,
        filename=safe_filename,
        content_disposition_type="inline",
    )
