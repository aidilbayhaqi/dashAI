# DashAI Railway 4-Service Deployment

Production Railway menggunakan empat service:

1. `dashai-web` — Next.js
2. `dashai-api` — FastAPI, realtime listener, dan outbox worker internal
3. `Postgres` — Railway PostgreSQL
4. `Redis` — Railway Redis

Qdrant tidak diwajibkan karena AI Analyst, AI Invoice, dan Financial Report
saat ini membaca data terstruktur melalui service ERP dan belum memakai RAG.
Mode development lokal tetap menggunakan `docker-compose.yml` dan dapat tetap
menjalankan Qdrant untuk pengembangan fitur embedding di masa depan.

## Batas scaling

Pada mode 4-service, `dashai-api` harus menggunakan satu replica karena outbox
worker berjalan di lifespan API. Jika API akan di-scale horizontal, pindahkan
worker kembali menjadi service terpisah dan set `ENABLE_OUTBOX_WORKER=false`
pada API.

## API service

- Root directory: `/apps/backend`
- Config file: `/apps/backend/railway.json`
- Volume opsional: mount ke `/app/uploads`
- `Dockerfile.railway` menjalankan bootstrap volume sebagai root, lalu menurunkan
  proses aplikasi ke user `app`.

Variable minimum:

```env
ENVIRONMENT=production
DEBUG=false
LOG_FORMAT=json
ENABLE_DOCS=false
DATABASE_URL=${{Postgres.DATABASE_URL}}
REDIS_URL=${{Redis.REDIS_URL}}
JWT_SECRET=<random-minimal-64-karakter>
COOKIE_SECURE=true
COOKIE_SAMESITE=none
CORS_ORIGINS=https://<domain-frontend>
REALTIME_ALLOW_QUERY_ACCESS_TOKEN=false
ENABLE_REALTIME_LISTENER=true
ENABLE_OUTBOX_WORKER=true
AI_AGENT_ENABLED=true
AI_AGENT_ACTIONS_ENABLED=true
AI_AGENT_ALLOW_RULE_FALLBACK=true
AI_PROVIDER=gemini
GEMINI_API_KEY=<opsional-jika-fallback-diizinkan>
GEMINI_MODEL=gemini-3.1-flash-lite
UPLOAD_DIR=/app/uploads
FORWARDED_ALLOW_IPS=*
RUN_MIGRATIONS=false
```

## Frontend service

- Root directory: `/apps/frontend`
- Config file: `/apps/frontend/railway.json`

Variable minimum:

```env
NODE_ENV=production
NEXT_TELEMETRY_DISABLED=1
NEXT_PUBLIC_API_URL=https://<domain-api>
```

`NEXT_PUBLIC_API_URL` adalah build-time variable. Setelah nilainya diubah,
frontend harus di-redeploy.

## Migration

Migration dijalankan oleh Railway pre-deploy command:

```bash
alembic upgrade head
```

Jangan mengaktifkan `RUN_MIGRATIONS=true` pada runtime Railway.

## Upload persistence

Untuk file yang harus bertahan setelah redeploy, attach Railway Volume ke API
dengan mount path `/app/uploads`. Tanpa volume, upload bersifat ephemeral.
