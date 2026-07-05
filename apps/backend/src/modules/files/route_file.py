from __future__ import annotations

import shutil
import uuid
from pathlib import Path
from typing import Annotated

from fastapi import APIRouter, File, Form, HTTPException, Query, UploadFile

from src.core.config import settings

router = APIRouter(prefix="/files", tags=["Files"])


ALLOWED_CONTEXTS = {
    "product-photo": "products",
    "employee-photo": "employees",
    "transaction-proof": "transactions",
    "company-logo": "companies",
    "general": "general",
}

ALLOWED_EXTENSIONS = {
    ".jpg",
    ".jpeg",
    ".png",
    ".webp",
    ".gif",
    ".pdf",
    ".doc",
    ".docx",
    ".xls",
    ".xlsx",
}


@router.get("/health")
async def files_health():
    return {
        "status": "ok",
        "module": "files",
    }


@router.post("/upload")
async def upload_file(
    file: Annotated[UploadFile, File(...)],
    context_form: Annotated[str | None, Form(alias="context")] = None,
    company_id_form: Annotated[str | None, Form(alias="company_id")] = None,
    context_query: Annotated[str | None, Query(alias="context")] = None,
    company_id_query: Annotated[str | None, Query(alias="company_id")] = None,
):
    context = context_form or context_query or "general"
    company_id = company_id_form or company_id_query or "public"

    if context not in ALLOWED_CONTEXTS:
        raise HTTPException(
            status_code=422,
            detail=f"Invalid upload context: {context}",
        )

    original_name = file.filename or "uploaded-file"
    extension = Path(original_name).suffix.lower()

    if extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"File extension {extension} is not allowed.",
        )

    folder_name = ALLOWED_CONTEXTS[context]
    safe_company_folder = str(company_id).replace("/", "-").replace("\\", "-")

    upload_dir = Path(settings.UPLOAD_DIR) / folder_name / safe_company_folder
    upload_dir.mkdir(parents=True, exist_ok=True)

    unique_filename = f"{uuid.uuid4().hex}{extension}"
    file_path = upload_dir / unique_filename

    try:
        with file_path.open("wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    finally:
        await file.close()

    public_path = (
        f"{settings.UPLOAD_URL_PREFIX}/"
        f"{folder_name}/"
        f"{safe_company_folder}/"
        f"{unique_filename}"
    )

    return {
        "message": "File uploaded successfully",
        "filename": unique_filename,
        "original_filename": original_name,
        "context": context,
        "company_id": company_id,
        "path": public_path,
        "url": public_path,
        "file_url": public_path,
    }