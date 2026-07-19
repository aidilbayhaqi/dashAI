# Production Deployment

Dokumen ini menjelaskan baseline deployment production DashAI setelah AI action hardening.

## Perubahan Runtime Production

- Migration dijalankan oleh service `migrate` satu kali sebelum API dan worker.
- API tidak menjalankan outbox worker sehingga replica API dapat diskalakan tanpa worker ganda.
- Outbox berjalan sebagai service `worker` terpisah.
- Realtime listener tetap berada pada setiap replica API agar koneksi WebSocket lokal menerima event Redis.
- AI invoice dan report memiliki one-time action token, idempotency, audit database, dan transaksi atomik.
- API menggunakan JSON log dan request ID di production.
- Frontend menggunakan Next.js standalone output.

## Persiapan Environment

Salin template:

```powershell
Copy-Item .env.production.example .env
```

Wajib diganti:

- `POSTGRES_PASSWORD`
- `REDIS_PASSWORD`
- `JWT_SECRET`
- `GEMINI_API_KEY`
- `CORS_ORIGINS`
- `NEXT_PUBLIC_API_URL`
- `QDRANT_API_KEY`

Production validation akan menolak startup jika:

- `DEBUG=true`
- `ENABLE_DOCS=true`
- cookie tidak secure
- CORS masih menggunakan HTTP
- JWT secret masih default atau terlalu pendek
- realtime access token masih diizinkan pada query string
- AI actions aktif tetapi AI Agent tidak aktif

## Menjalankan Production Compose

```powershell
docker compose --env-file .env `
  -f docker-compose.production.yml `
  config
```

Kemudian:

```powershell
docker compose --env-file .env `
  -f docker-compose.production.yml `
  up -d --build
```

Periksa:

```powershell
docker compose --env-file .env `
  -f docker-compose.production.yml `
  ps
```

Service yang diharapkan:

- `postgres`
- `redis`
- `qdrant`
- `migrate` dengan status selesai sukses
- `api`
- `worker`
- `frontend`

## Migration

Jangan menjalankan migration dari setiap replica API. Service `migrate` akan menjalankan:

```text
alembic upgrade head
```

API dan worker hanya dimulai setelah migration sukses.

Migration production hardening menambahkan tabel:

```text
ai_action_audits
```

Tabel tersebut menyimpan fingerprint request, action, provider, target record, status, durasi, dan error yang sudah direduksi. Prompt mentah tidak disimpan.

## AI Action Transaction Boundary

Invoice:

```text
claim Redis token
→ validate tenant/policy
→ insert invoice
→ insert success audit
→ commit satu transaksi
→ publish realtime secara best effort
```

Jika gagal sebelum commit, database di-rollback dan token dilepas. Setelah commit sukses tidak ada proses yang boleh membuka token kembali.

Financial report:

```text
claim Redis token
→ calculate and flush snapshot
→ insert success audit
→ commit satu transaksi
→ publish realtime secara best effort
```

## Scaling

API dapat dinaikkan jumlah replica-nya karena outbox worker sudah terpisah. Untuk tahap awal gunakan satu replica worker. Database locking `FOR UPDATE SKIP LOCKED` tetap melindungi apabila worker ditambah di masa depan.

## File Storage

Jangan menggunakan filesystem container ephemeral tanpa volume. `docker-compose.production.yml` memakai `uploads_data`. Pada Railway atau platform lain, gunakan persistent volume atau object storage kompatibel S3.

## Health Check

```text
GET /health
GET /health/db
GET /health/redis
GET /ready
```

Gunakan `/ready` untuk readiness probe. Respons 200 hanya diberikan jika PostgreSQL dan Redis terhubung.

## Rollback

Sebelum deployment:

1. backup PostgreSQL;
2. catat image tag sebelumnya;
3. jalankan migration;
4. deploy API, worker, dan frontend;
5. jalankan smoke test.

Rollback aplikasi menggunakan image tag sebelumnya. Downgrade migration hanya dilakukan setelah memastikan data audit baru tidak lagi dibutuhkan.
