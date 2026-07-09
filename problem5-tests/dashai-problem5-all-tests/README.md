# DashAI Problem 5 — Complete Test Suite

Paket ini memasang dan menjalankan seluruh test Problem 5 sekaligus.

## Test yang disertakan

- `test_16_live_idempotency.py`
  - Idempotency generic CRUD.
  - Replay response.
  - Key sama dengan payload berbeda.
  - Unique business key.

- `test_17_live_stock_concurrency.py`
  - Dua stock-out concurrent.
  - Stok tidak boleh negatif.
  - Replay stock movement.
  - Duplicate source rollback.

- `test_18_live_payroll_integrity.py`
  - Payroll number duplicate.
  - Calculate payroll idempotent.
  - Finance posting idempotent.
  - Satu finance transaction per payroll.

- `test_19_live_finance_integrity.py`
  - Transaction dan invoice replay.
  - Duplicate number menjadi 409.
  - Total nol/negatif ditolak.
  - Due date dan paid amount divalidasi.

- `test_20_domain_validation_unit.py`
  - Product price.
  - Stock quantity.
  - Employee salary.
  - Attendance duration.
  - Leave period.
  - Payroll totals.
  - KPI score/rating.
  - Finance amount.

- `test_21_database_contract_static.py`
  - Unique constraint kritis.
  - Numeric precision/scale.
  - Migration constraint.

- `test_22_frontend_format_contract_static.py`
  - Rupiah hanya untuk nominal uang.
  - Stock memakai number.
  - KPI score memakai decimal.
  - Rating memakai rating/text.
  - Work minutes memakai angka + menit.

## Instalasi

Dari root project:

```powershell
Expand-Archive `
  .\dashai-problem5-all-tests.zip `
  .\problem5-tests `
  -Force

python .\problem5-tests\install_problem5_tests.py
```

## Jalankan semua

```powershell
powershell -ExecutionPolicy Bypass `
  -File .\run_problem5_tests.ps1
```

## Mode lebih cepat

Tanpa full pytest suite dan tanpa production build:

```powershell
powershell -ExecutionPolicy Bypass `
  -File .\run_problem5_tests.ps1 `
  -SkipFullSuite `
  -SkipBuild
```

## Prasyarat

- Container `api`, `postgres`, dan `redis` aktif.
- User test default tersedia:
  - `superadmin@dashai.test`
  - password `admin123`
- Database sudah mempunyai minimal satu company.
- Stock concurrency memerlukan minimal satu branch.
