from datetime import date, datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field


AgentConfidence = Literal[
    "low",
    "medium",
    "high",
]


class GeminiAgentQuestionRequest(BaseModel):
    question: str = Field(
        ...,
        min_length=3,
        max_length=600,
    )

    company_id: UUID | None = None
    branch_id: UUID | None = None

    period_start: date | None = None
    period_end: date | None = None


class GeminiAgentChatResponse(BaseModel):
    generated_at: datetime

    mode: Literal["read_only_agent"] = (
        "read_only_agent"
    )
    provider: Literal["gemini"] = "gemini"

    model: str

    company_id: UUID
    branch_id: UUID | None = None

    question: str
    answer: str

    confidence: AgentConfidence = "medium"

    tools_used: list[str] = Field(
        default_factory=list,
    )

    evidence: list[str] = Field(
        default_factory=list,
    )

    suggested_links: list[str] = Field(
        default_factory=list,
    )

    needs_human_review: bool = True