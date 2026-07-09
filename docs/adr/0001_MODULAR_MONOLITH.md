# ADR 0001 — Modular Monolith

## Status

Accepted

## Context

DashAI memiliki banyak domain yang saling terkait:

- product;
- inventory;
- CRM;
- sales;
- procurement;
- finance;
- accounting;
- HR;
- payroll;
- tax;
- automation;
- AI.

Memecah semua domain menjadi microservices terlalu awal meningkatkan kompleksitas deployment, transaction, observability, dan testing.

## Decision

Gunakan modular monolith dengan:

- satu backend deployment;
- satu PostgreSQL utama;
- modul terpisah;
- public application service;
- domain events;
- transactional outbox;
- tenant isolation;
- worker untuk side effects.

## Consequences

### Positive

- transaction lintas modul lebih aman;
- development lebih cepat;
- debugging sederhana;
- CI lebih mudah;
- biaya infrastruktur lebih rendah.

### Negative

- disiplin boundary harus dijaga;
- module coupling harus diaudit;
- worker dan outbox tetap dibutuhkan;
- database dapat menjadi bottleneck ketika skala besar.

## Future Split Criteria

Modul baru dipisah menjadi service bila:

- memiliki beban sangat berbeda;
- membutuhkan deployment independen;
- memiliki ownership tim terpisah;
- database contention nyata;
- SLA berbeda;
- event contract sudah stabil.
