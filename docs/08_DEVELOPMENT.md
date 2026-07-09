# Development Guide

## 1. Prerequisites

- Git
- Docker Desktop
- Node.js sesuai project
- pnpm sesuai lockfile
- Python 3.12 bila backend dijalankan tanpa Docker
- PowerShell

## 2. Clone

```powershell
git clone <repository-url>
cd DashAI
```

## 3. Environment

```powershell
Copy-Item .env.example .env
```

Isi nilai development. Jangan commit `.env`.

## 4. Run Docker

```powershell
docker compose `
  -f docker-compose.yml `
  -f docker-compose.hardened.yml `
  up -d --build
```

## 5. Status dan Log

```powershell
docker compose `
  -f docker-compose.yml `
  -f docker-compose.hardened.yml `
  ps
```

```powershell
docker compose `
  -f docker-compose.yml `
  -f docker-compose.hardened.yml `
  logs -f api frontend
```

## 6. Migration

Masuk backend:

```powershell
cd apps/backend
```

Buat migration:

```powershell
alembic revision `
  --autogenerate `
  -m "add sales order automation"
```

Apply:

```powershell
alembic upgrade head
```

Review migration sebelum dijalankan.

## 7. Backend Test

```powershell
docker compose `
  -f docker-compose.yml `
  -f docker-compose.hardened.yml `
  exec `
  -w /app `
  -e PYTHONPATH=/app `
  api `
  python -m pytest -q -p no:cacheprovider
```

Test tertentu:

```powershell
python -m pytest `
  src/tests/test_sales_order.py `
  -q
```

## 8. Frontend

```powershell
cd apps/frontend
pnpm install
pnpm dev
```

Check:

```powershell
pnpm exec tsc --noEmit
pnpm lint
pnpm build
```

## 9. Branch Strategy

```text
main
develop
feature/*
fix/*
security/*
docs/*
```

Contoh:

```powershell
git switch -c feature/sales-order-automation
```

## 10. Commit

```powershell
git diff --check
git status
git add <specific-files>
git commit -m "add sales order automation"
git push -u origin HEAD
```

Jangan memakai `git add .` sebelum memeriksa backup, `.env`, upload, dan file temporary.

## 11. Local Definition of Ready

Sebelum coding:

- requirement tertulis;
- flow bisnis jelas;
- status machine jelas;
- event yang dihasilkan jelas;
- accounting impact jelas;
- tenant scope jelas;
- permission jelas;
- acceptance criteria jelas.
