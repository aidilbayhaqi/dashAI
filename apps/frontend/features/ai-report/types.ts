export type AIReportModuleKey = "overview";
export type AIInsightSeverity = "info" | "warning" | "critical";
export type AIPriority = "low" | "medium" | "high";

export type AIAgentConfidence =
  | "low"
  | "medium"
  | "high";

export type AIAgentRequest = {
  question: string;

  company_id?: string;
  branch_id?: string;

  period_start?: string;
  period_end?: string;
};

export type AIAgentResponse = {
  generated_at: string;

  mode: "read_only_agent";
  provider: "gemini";
  model: string;

  company_id: string;
  branch_id: string | null;

  question: string;
  answer: string;

  confidence: AIAgentConfidence;

  tools_used: string[];
  evidence: string[];
  suggested_links: string[];

  needs_human_review: boolean;
};

export type AIChatMessage = {
  id: string;
  role: "user" | "assistant";

  content: string;
  createdAt: string;

  confidence?: AIAgentConfidence;
  evidence?: string[];
  suggestedLinks?: string[];
  toolsUsed?: string[];
};


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
