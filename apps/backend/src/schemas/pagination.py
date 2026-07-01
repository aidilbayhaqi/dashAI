from typing import Generic, TypeVar

from pydantic import BaseModel, Field
from pydantic.generics import GenericModel


T = TypeVar("T")


class PaginationMeta(BaseModel):
    total: int
    page: int
    limit: int
    total_pages: int
    has_next: bool
    has_prev: bool


class PaginatedResponse(GenericModel, Generic[T]):
    data: list[T]
    meta: PaginationMeta


class ListQueryParams(BaseModel):
    page: int = Field(default=1, ge=1)
    limit: int = Field(default=20, ge=1, le=100)
    q: str | None = None
    sort_by: str = "created_at"
    sort_order: str = "desc"