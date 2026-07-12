from datetime import date, datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field


InsightSeverity = Literal["info", "warning", "critical"]
InsightPriority = Literal["low", "medium", "high"]


class AIAnalyticsFinding(BaseModel):
    id: str
    module: str
    severity: InsightSeverity
    title: str
    description: str
    metric_label: str | None = None
    metric_value: str | None = None
    href: str | None = None


class AIAnalyticsRecommendation(BaseModel):
    id: str
    module: str
    priority: InsightPriority
    title: str
    rationale: str
    href: str | None = None


class AIAnalyticsSummaryResponse(BaseModel):
    generated_at: datetime
    mode: Literal["read_only"] = "read_only"
    provider: Literal["rules", "openai"] = "rules"
    company_id: UUID | None = None
    branch_id: UUID | None = None
    period_start: date
    period_end: date
    headline: str
    executive_summary: str
    health_score: int = Field(ge=0, le=100)
    findings: list[AIAnalyticsFinding] = Field(default_factory=list)
    recommendations: list[AIAnalyticsRecommendation] = Field(default_factory=list)
    guardrails: list[str] = Field(default_factory=list)


class AIAnalyticsQuestionRequest(BaseModel):
    question: str = Field(min_length=3, max_length=600)
    company_id: UUID | None = None
    branch_id: UUID | None = None
    period_start: date | None = None
    period_end: date | None = None


class AIAnalyticsAnswerResponse(BaseModel):
    generated_at: datetime
    mode: Literal["read_only"] = "read_only"
    provider: Literal["rules", "openai"] = "rules"
    question: str
    answer: str
    evidence: list[str] = Field(default_factory=list)
    suggested_links: list[str] = Field(default_factory=list)
