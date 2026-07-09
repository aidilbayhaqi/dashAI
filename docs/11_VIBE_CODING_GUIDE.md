# Vibe Coding Guide

Tujuan dokumen ini adalah membuat AI coding assistant menghasilkan perubahan yang terarah dan tidak merusak modul lain.

## 1. Format Perintah Wajib

Gunakan format:

```text
TUJUAN
KONTEKS PROJECT
SCOPE FILE
BUSINESS RULE
INVARIANT
STATUS FLOW
EVENT
SECURITY
ACCEPTANCE CRITERIA
TEST
LARANGAN
OUTPUT
```

## 2. Template

```text
TUJUAN
Implementasikan fitur Sales Order approval dan stock reservation.

KONTEKS PROJECT
Backend FastAPI + SQLAlchemy Async + PostgreSQL.
Frontend Next.js + TypeScript + TanStack Query.
Multi-tenant berdasarkan company_id.

SCOPE FILE
apps/backend/src/modules/sales/**
apps/backend/src/modules/products/**
apps/backend/src/tests/**
apps/frontend/features/sales/**
Jangan ubah modul finance kecuali melalui public service/event.

BUSINESS RULE
- Draft dapat disubmit.
- Submitted dapat diapprove.
- Approve harus mereservasi stok.
- Stok tidak boleh negatif.
- Setiap item menyimpan price dan tax snapshot.
- Approval menghasilkan event sales.order.approved.

INVARIANT
- Tenant isolation wajib.
- Tidak boleh duplicate reservation.
- Gunakan Decimal untuk uang.
- Gunakan idempotency key.

STATUS FLOW
draft -> submitted -> approved -> stock_reserved
submitted -> rejected
approved -> cancelled hanya dengan release reservation

EVENT
sales.order.submitted
sales.order.approved
inventory.stock.reserved

SECURITY
Permission:
sales.order.submit
sales.order.approve

ACCEPTANCE CRITERIA
- API berhasil.
- Migration tersedia.
- Static typing berhasil.
- Test cross-tenant gagal dengan 403/404.
- Duplicate request tidak menggandakan reservation.

TEST
Tambahkan unit dan integration tests.
Jalankan pytest, tsc, lint, dan build.

LARANGAN
- Jangan hard-code company_id.
- Jangan update stock langsung dari route.
- Jangan menghapus logic product/finance lama.
- Jangan memakai any.
- Jangan menonaktifkan test.

OUTPUT
- Tampilkan file yang diubah.
- Berikan full code hanya untuk file baru atau file yang diubah besar.
- Berikan command migration dan test.
```

## 3. Prompt Audit Sebelum Coding

```text
Analisis dulu struktur existing yang terkait fitur.
Jangan menulis kode sebelum menjelaskan:
1. file yang akan diubah;
2. dependency antar-modul;
3. risiko regresi;
4. migration yang dibutuhkan;
5. test yang akan ditambahkan.
```

## 4. Prompt Refactor Aman

```text
Refactor tanpa mengubah behavior.
Pertahankan API contract, field name, route, permission, dan response shape.
Tambahkan characterization test sebelum refactor.
```

## 5. Prompt Bug Fix

```text
Reproduksi bug melalui test terlebih dahulu.
Jelaskan root cause.
Perbaiki minimal scope.
Jalankan regression test modul terkait.
Jangan mengubah business rule tanpa persetujuan.
```

## 6. Prompt Automation

```text
Implementasikan automation berbasis domain event dan outbox.
Pisahkan proses synchronous dan asynchronous.
Handler harus idempotent.
Simpan audit dan correlation_id.
Jangan gunakan AI untuk keputusan wajib sistem.
```

## 7. Prompt Database Migration

```text
Buat migration Alembic yang backward-safe.
Jangan drop column langsung.
Tambahkan nullable/default bila diperlukan.
Backfill data.
Tambahkan constraint setelah data valid.
Sediakan downgrade yang masuk akal.
```

## 8. Checklist Jawaban AI

AI harus memberikan:

- asumsi;
- file changes;
- migration;
- code;
- tests;
- commands;
- rollback;
- known risks.

## 9. Red Flags

Tolak solusi bila AI:

- menghapus test agar hijau;
- menggunakan `except Exception: pass`;
- menonaktifkan tenant filter;
- menyimpan token di localStorage tanpa alasan;
- hard-code rate pajak;
- membuat journal tidak seimbang;
- memakai float untuk uang;
- langsung mengurangi stok dari route;
- mengakses internal table modul lain tanpa service.
