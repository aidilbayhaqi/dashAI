# DashAI Problem 7 — Docker, Testing, and CI Hardening

Paket ini **tidak menimpa `docker-compose.yml` utama**. Hardening lokal
ditambahkan melalui `docker-compose.hardened.yml`, sedangkan konfigurasi
production tersedia terpisah di `docker-compose.production.yml`.

## Perubahan utama

- Dockerfile development dan production dipisahkan.
- Production image memakai multi-stage build.
- Backend dan frontend production berjalan sebagai non-root user.
- Healthcheck API dan frontend.
- Restart policy, graceful stop, log rotation, dan `no-new-privileges`.
- Production Compose memakai network internal untuk database.
- pgAdmin hanya aktif melalui profile `tools`.
- `.dockerignore` mencegah cache, secret, test, dan dependency masuk image.
- Pytest marker dipisahkan: static, unit, integration, dan live.
- Test runner PowerShell dan shell.
- GitHub Actions untuk backend, frontend, dan Docker build.
- Docker audit report.
- Cleanup script dengan dry-run default.

Docker merekomendasikan pemisahan build/runtime melalui multi-stage build,
menjalankan concern terpisah per service, serta menggunakan Compose profiles
untuk service opsional. GitHub merekomendasikan setup-python/setup-node untuk
runner yang konsisten.

## Instalasi

```powershell
Expand-Archive `
  .\dashai-problem7-docker-ci.zip `
  .\problem7 `
  -Force

python `
  .\problem7\dashai-problem7-docker-ci\install_problem7.py
```

## Jalankan mode cepat

```powershell
powershell -ExecutionPolicy Bypass `
  -File .\run_problem7.ps1 `
  -SkipBuild
```

## Jalankan validasi penuh

```powershell
powershell -ExecutionPolicy Bypass `
  -File .\run_problem7.ps1
```

## Menjalankan pgAdmin

```powershell
docker compose `
  -f docker-compose.yml `
  -f docker-compose.hardened.yml `
  --profile tools `
  up -d pgadmin
```

## Validasi production Compose

```powershell
docker compose `
  -f docker-compose.production.yml `
  config --quiet
```

Production compose memerlukan minimal:

```dotenv
POSTGRES_PASSWORD=...
REDIS_PASSWORD=...
PGADMIN_DEFAULT_EMAIL=admin@example.com
PGADMIN_DEFAULT_PASSWORD=...
```

## Cleanup setelah semua lolos

Lihat kandidat file tanpa menghapus:

```powershell
powershell -ExecutionPolicy Bypass `
  -File .\scripts\cleanup-problem-files.ps1
```

Hapus installer sementara setelah Git commit:

```powershell
powershell -ExecutionPolicy Bypass `
  -File .\scripts\cleanup-problem-files.ps1 `
  -Apply
```

Backup `.problem*-backups` tidak dihapus kecuali memakai:

```powershell
powershell -ExecutionPolicy Bypass `
  -File .\scripts\cleanup-problem-files.ps1 `
  -Apply `
  -IncludeBackups
```

## Catatan penting

Jangan langsung menjalankan production Compose pada server sebelum `.env`
production, domain/CORS, TLS reverse proxy, backup database, dan secret manager
ditetapkan. Paket ini menyiapkan fondasi image dan orchestration; review final
akan dilakukan dari ZIP repository terbaru yang kamu kirim setelah cleanup.
