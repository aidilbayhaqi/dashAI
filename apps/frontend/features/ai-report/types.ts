export type AIReportModuleKey = "overview";
export type AIInsightSeverity = "info" | "warning" | "critical";
export type AIPriority = "low" | "medium" | "high";

export type AIAnalyticsFinding = {
  id: string;
  module: string;
  severity: AIInsightSeverity;
  title: string;
  description: string;
  metric_label: string | null;
  metric_value: string | null;
  href: string | null;
};

export type AIAnalyticsRecommendation = {
  id: string;
  module: string;
  priority: AIPriority;
  title: string;
  rationale: string;
  href: string | null;
};

export type AIAnalyticsSummary = {
  generated_at: string;
  mode: "read_only";
  provider: "rules" | "openai";
  company_id: string | null;
  branch_id: string | null;
  period_start: string;
  period_end: string;
  headline: string;
  executive_summary: string;
  health_score: number;
  findings: AIAnalyticsFinding[];
  recommendations: AIAnalyticsRecommendation[];
  guardrails: string[];
};

export type AIAnalyticsAnswer = {
  generated_at: string;
  mode: "read_only";
  provider: "rules" | "openai";
  question: string;
  answer: string;
  evidence: string[];
  suggested_links: string[];
};
