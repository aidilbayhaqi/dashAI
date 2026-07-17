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
  request_id: string;

  mode: "read_only_agent";
  provider: "gemini" | "rules";
  model: string;

  company_id: string;
  branch_id: string | null;

  question: string;
  answer: string;

  confidence: AIAgentConfidence;

  tools_used: string[];
  evidence: string[];
  suggested_links: string[];
  warnings: string[];
  degraded: boolean;

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


export type AIActionProvider = "gemini" | "rules";

export type AIInvoiceDraft = {
  invoice_no: string;
  client_name: string;
  invoice_date: string;
  due_date: string | null;
  subtotal_amount: string;
  tax_rate_percent: string;
  tax_amount: string;
  total_amount: string;
  notes: string | null;
};

export type AIInvoiceDraftResponse = {
  draft_id: string;
  action_token: string;
  expires_at: string;
  provider: AIActionProvider;
  draft: AIInvoiceDraft;
  warnings: string[];
  requires_confirmation: true;
};

export type CreatedInvoice = AIInvoiceDraft & {
  id: string;
  company_id: string;
  branch_id: string | null;
  paid_amount: string;
  status: string;
  creation_mode: string;
  created_at: string;
  updated_at: string;
};

export type FinancialReportType =
  | "profit_loss"
  | "cashflow"
  | "balance_sheet";

export type AIFinancialReportDraft = {
  report_type: FinancialReportType;
  start_date: string;
  end_date: string;
  report_date: string;
  beginning_cash_balance: string;
  title: string;
};

export type AIReportDraftResponse = {
  draft_id: string;
  action_token: string;
  expires_at: string;
  provider: AIActionProvider;
  draft: AIFinancialReportDraft;
  warnings: string[];
  requires_confirmation: true;
};

export type AIReportExecutionResponse = {
  report_type: FinancialReportType;
  snapshot_id: string;
  message: string;
  result: Record<string, unknown>;
};
