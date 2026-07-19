from datetime import date, datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field


AgentConfidence = Literal[
    "low",
    "medium",
    "high",
]


class GeminiAgentConversationMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(min_length=1, max_length=2000)


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
    history: list[GeminiAgentConversationMessage] = Field(
        default_factory=list,
        max_length=8,
    )


class GeminiAgentChatResponse(BaseModel):
    generated_at: datetime
    request_id: UUID
    mode: Literal["read_only_agent"] = "read_only_agent"
    provider: Literal["gemini", "rules"] = "rules"
    model: str
    company_id: UUID
    branch_id: UUID | None = None
    question: str
    answer: str
    confidence: AgentConfidence = "medium"
    tools_used: list[str] = Field(default_factory=list)
    evidence: list[str] = Field(default_factory=list)
    suggested_links: list[str] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)
    degraded: bool = False
    needs_human_review: bool = True


class GeminiProviderStatusResponse(BaseModel):
    enabled: bool
    configured: bool
    provider: str
    model: str
    key_source: str | None = None
    key_fingerprint: str | None = None
    fallback_enabled: bool
    probe_status: Literal["not_run", "disabled", "ok", "failed"]
    error_code: str | None = None
    message: str
