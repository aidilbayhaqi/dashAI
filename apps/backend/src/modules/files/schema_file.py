from pydantic import BaseModel


class FileUploadResponse(BaseModel):
    filename: str
    original_filename: str
    content_type: str | None = None
    size: int
    url: str
    path: str
    context: str