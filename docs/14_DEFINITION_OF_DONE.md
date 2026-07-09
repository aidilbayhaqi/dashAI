# Definition of Done

Sebuah fitur dianggap selesai bila seluruh item berikut terpenuhi.

## Business

- business rule tertulis;
- state transition jelas;
- approval jelas;
- accounting impact jelas;
- tax impact jelas;
- cancellation/reversal flow tersedia.

## Backend

- route;
- schema;
- service;
- repository;
- tenant scope;
- permission;
- migration;
- audit;
- event;
- idempotency bila diperlukan.

## Frontend

- list;
- form;
- detail;
- loading skeleton;
- empty state;
- validation;
- permission-based action;
- error handling;
- optimistic behavior hanya bila aman.

## Data

- constraint;
- index;
- unique key tenant-aware;
- Decimal untuk uang;
- timezone jelas;
- snapshot untuk rule yang berubah.

## Test

- unit;
- integration;
- cross-tenant;
- permission;
- duplicate;
- invalid transition;
- rollback;
- event;
- accounting balance.

## Delivery

- Docker build;
- CI green;
- no secret committed;
- migration reviewed;
- documentation updated;
- changelog;
- rollback plan.

## Review

- tidak ada `any` baru tanpa alasan;
- tidak ada broad exception tersembunyi;
- tidak ada hard-coded company;
- tidak ada hard-coded tax rate;
- tidak ada direct cross-module table mutation;
- tidak ada test yang dinonaktifkan untuk meloloskan CI.
