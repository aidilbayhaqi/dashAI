# Implementation Roadmap

## Phase 0 — Stabilization

- CI hijau;
- migration konsisten;
- Docker production build;
- tenant tests;
- upload permission permanen;
- repository cleanup;
- documentation baseline.

## Phase 1 — Foundation Automation

Tambahkan:

- domain event envelope;
- outbox;
- processed event table;
- workflow state machine;
- approval engine;
- document sequence;
- audit standard;
- accounting posting service.

Output:

```text
Event-driven modular monolith
```

## Phase 2 — Sales and Inventory

Implementasi:

- quotation;
- sales order;
- sales order item;
- approval;
- inventory reservation;
- goods issue;
- stock movement;
- invoice trigger.

Acceptance:

- order-to-cash flow berjalan end-to-end;
- stock tidak negatif;
- invoice tidak duplicate;
- jurnal seimbang.

## Phase 3 — Procurement

Implementasi:

- reorder policy;
- purchase request;
- purchase order;
- goods receipt;
- vendor bill;
- accounts payable;
- supplier payment.

## Phase 4 — Tax Engine

Implementasi:

- tax profiles;
- effective date;
- inclusive/exclusive;
- tax snapshot;
- tax lines;
- tax liability summary.

## Phase 5 — HR and Payroll

Implementasi:

- attendance closing;
- KPI finalization;
- salary components;
- payroll calculation;
- approval;
- payslip;
- payroll payable;
- payment posting.

## Phase 6 — Accounting

Implementasi:

- chart of accounts;
- journal posting;
- period close;
- reversal;
- bank reconciliation;
- AR/AP aging;
- trial balance;
- profit and loss;
- balance sheet;
- cashflow.

## Phase 7 — Advanced Automation

- recurring invoice;
- overdue reminder;
- auto-reorder;
- recurring journal;
- approval escalation;
- scheduled reporting;
- notification center;
- webhook integration.

## Phase 8 — AI Agent

Tahap 1:

- read-only questions;
- retrieval;
- recommendations;
- report narrative.

Tahap 2:

- action proposal;
- human approval;
- tool execution;
- audit.

Tahap 3:

- workflow optimization;
- anomaly detection;
- forecasting;
- policy simulation.
