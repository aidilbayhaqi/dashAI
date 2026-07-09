from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True, slots=True)
class UploadContextPolicy:
    """
    Aturan penyimpanan untuk satu context upload.

    `is_public=True` berarti file boleh disajikan langsung melalui
    StaticFiles. `is_public=False` berarti file hanya boleh diakses
    melalui endpoint terautentikasi.
    """

    folder: str
    is_public: bool
    allowed_extensions: frozenset[str]
    allowed_content_types: frozenset[str]


IMAGE_EXTENSIONS = frozenset(
    {
        ".jpg",
        ".jpeg",
        ".png",
        ".webp",
    }
)

IMAGE_CONTENT_TYPES = frozenset(
    {
        "image/jpeg",
        "image/png",
        "image/webp",
    }
)

DOCUMENT_EXTENSIONS = frozenset(
    {
        ".pdf",
        ".doc",
        ".docx",
        ".xls",
        ".xlsx",
    }
)

DOCUMENT_CONTENT_TYPES = frozenset(
    {
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }
)


UPLOAD_CONTEXT_POLICIES: dict[str, UploadContextPolicy] = {
    "product-photo": UploadContextPolicy(
        folder="products",
        is_public=True,
        allowed_extensions=IMAGE_EXTENSIONS,
        allowed_content_types=IMAGE_CONTENT_TYPES,
    ),
    "company-logo": UploadContextPolicy(
        folder="companies",
        is_public=True,
        allowed_extensions=IMAGE_EXTENSIONS,
        allowed_content_types=IMAGE_CONTENT_TYPES,
    ),
    "employee-photo": UploadContextPolicy(
        folder="employees",
        is_public=False,
        allowed_extensions=IMAGE_EXTENSIONS,
        allowed_content_types=IMAGE_CONTENT_TYPES,
    ),
    "transaction-proof": UploadContextPolicy(
        folder="transactions",
        is_public=False,
        allowed_extensions=(
            IMAGE_EXTENSIONS
            | frozenset({".pdf"})
        ),
        allowed_content_types=(
            IMAGE_CONTENT_TYPES
            | frozenset({"application/pdf"})
        ),
    ),
    "general": UploadContextPolicy(
        folder="general",
        is_public=False,
        allowed_extensions=(
            IMAGE_EXTENSIONS
            | DOCUMENT_EXTENSIONS
        ),
        allowed_content_types=(
            IMAGE_CONTENT_TYPES
            | DOCUMENT_CONTENT_TYPES
        ),
    ),
}


DEFAULT_UPLOAD_CONTEXT = "general"


def get_upload_policy(
    context: str,
) -> UploadContextPolicy | None:
    return UPLOAD_CONTEXT_POLICIES.get(
        context
    )


def normalize_extension(
    filename: str | None,
) -> str:
    """
    Mengambil extension secara aman dan mengubahnya ke lowercase.
    """

    safe_name = Path(
        filename or "uploaded-file"
    ).name

    return Path(
        safe_name
    ).suffix.lower()


def sanitize_filename(
    filename: str | None,
) -> str:
    """
    Menghapus path traversal dari nama file asli.
    """

    return Path(
        filename or "uploaded-file"
    ).name


def storage_visibility_folder(
    policy: UploadContextPolicy,
) -> str:
    return (
        "public"
        if policy.is_public
        else "private"
    )
