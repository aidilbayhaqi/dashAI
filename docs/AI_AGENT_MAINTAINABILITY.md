# DashAI AI Agent – Architecture and Maintenance Guide

## Scope

The AI layer is intentionally constrained for an ERP demo:

- **Business Analyst Agent** reads tenant-scoped summaries and alerts.
- **Invoice Assistant** converts natural language into an editable draft.
- **Financial Report Assistant** converts natural language into safe report parameters.
- AI never writes arbitrary SQL and never marks invoices paid.
- Financial actions require permission, tenant validation, human confirmation, idempotency, and a one-time action token.

## Backend structure

```text
src/ai/
├── gemini_provider.py          # Gemini adapter and structured output
├── gemini_agent_service.py     # Read-only business analyst
├── invoice_parser.py           # Gemini schema + deterministic fallback parser
├── report_parser.py            # Financial report intent/date parser
├── invoice_action_service.py   # Invoice draft and confirmation orchestration
├── report_action_service.py    # Report draft and confirmation orchestration
├── agent_action_common.py      # Shared money/scope helpers
├── action_token.py             # Signed action token and draft binding
├── action_token_store.py       # Redis one-time-token claim
├── agent_action_schema.py      # Public request/response contracts
└── agent_action_service.py     # Compatibility facade for existing imports
```

Keep provider integration, parsing, orchestration, and persistence separate. A new AI provider should implement the provider boundary instead of changing invoice or finance services.

## Frontend structure

```text
features/ai-report/
├── components/
│   ├── ai-answer-markdown.tsx
│   ├── ai-chat-panel.tsx
│   ├── ai-overview.tsx
│   ├── invoice-draft-preview.tsx
│   └── report-draft-preview.tsx
├── ai-agent-actions.tsx
├── api.ts
├── client.tsx
├── hook.ts
├── types.ts
├── use-ai-actions.ts
├── utils.ts
└── utils.test.ts
```

`client.tsx` should remain a small page orchestrator. Domain-specific UI and formatting belong in components and `utils.ts`.

## Invoice flow

```text
Prompt
  -> tenant + permission validation
  -> Gemini structured extraction
  -> deterministic parser fallback when provider fails
  -> backend subtotal/tax/total calculation
  -> draft + signed token bound to draft_id
  -> user review/edit
  -> confirmation with Idempotency-Key
  -> token verification and Redis one-time claim
  -> backend recalculation and finance write policy
  -> invoice created with status=draft, creation_mode=ai_assisted
```

Never trust `tax_amount`, `total_amount`, company scope, or branch scope from the browser or model.

## Report flow

```text
Prompt
  -> report intent/date extraction
  -> company-level scope validation
  -> editable preview
  -> confirmation with one-time token
  -> existing deterministic finance snapshot service
```

Balance sheet titles use `Neraca per <date>`. Profit/loss and cashflow use a period range. Current report snapshots are company-level; branch-restricted users are denied rather than receiving cross-branch totals.

## Fallback behavior

Gemini failure must not break the demo. The local parser supports explicit prompts such as:

```text
Buat invoice untuk PT Maju Bersama senilai Rp5.000.000, PPN 11%, jatuh tempo 14 hari
```

Ambiguous prompts must return validation errors instead of guessing an arbitrary number such as a date.

## Security invariants

1. Scope comes from the authenticated user and server validation.
2. AI tools are read-only and receive redacted business data.
3. Confirmation tokens are bound to user, action, company, optional branch, and `draft_id`.
4. Tokens are one-time-use through Redis.
5. Idempotency protects retry of the same HTTP operation.
6. Money values are recalculated by backend services.
7. Raw prompts are not persisted into invoice notes.
8. Conversation history is limited and treated as untrusted context.

## Validation commands

Backend:

```bash
cd apps/backend
PYTHONPATH=. python -m compileall -q src
PYTHONPATH=. pytest -q
```

Frontend:

```bash
cd apps/frontend
pnpm install --frozen-lockfile
pnpm exec tsc --noEmit
pnpm test
pnpm exec eslint features/ai-report
pnpm build
```

Live tests require the Docker API, PostgreSQL, and Redis services to be running.
