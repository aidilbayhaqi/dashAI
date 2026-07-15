# DashAI Secure Mobile Full Fix

Tanggal paket: 12 Juli 2026

Paket ini menutup concern audit backend, frontend, dashboard, realtime, Finance, automation, AI analytics, Docker/CI, dan mobile UX. Fokus utamanya adalah menjaga integritas domain sebelum DashAI dikembangkan menjadi PWA atau aplikasi Android wrapper.

## Ringkasan perubahan

### Backend dan Finance

- Write path Finance penting tidak lagi dapat mengubah status lewat generic PATCH.
- Transaction memakai command `post`, `void`, dan `cancel`.
- Invoice memakai command `send`, `payments`, dan `cancel`.
- Journal memakai command `post` dan `reverse`; reversal membuat journal pembalik nyata.
- Tax record memakai workflow `draft -> accrued -> paid -> reported`.
- Cash balance hanya berubah lewat command adjustment yang menghasilkan audit transaction.
- Budget hanya dapat diedit saat draft; nilai actual/variance dilindungi.
- Snapshot cashflow, profit-loss, margin, dan balance-sheet immutable dan harus dihasilkan dari report service.
- Constraint database melindungi nominal negatif, total nol, dan pembayaran lebih besar dari invoice.
- Dependency Python diberi batas versi agar build lebih reproducible.
- Semua waktu internal diseragamkan ke UTC helper.

### Permission dan tenant isolation

- Permission baru untuk dashboard summary, AI analytics, dan realtime events.
- Dashboard dan AI memfilter agregat berdasarkan permission pengguna.
- Realtime dibatasi berdasarkan company, module permission, dan branch scope.
- WebSocket menggunakan one-time ticket; access token tidak lagi dikirim lewat query string pada frontend.
- Token blacklist, origin validation, heartbeat, ukuran frame, connection limit, dedup, dan reconnect backoff tetap aktif.

### Realtime dan event

- Generic CRUD menerbitkan event minimal setelah commit berhasil.
- Event memuat `branch_id` ketika relevan.
- Dashboard cache diinvalidasi ketika event domain dipublikasikan.
- Outbox sekarang memakai status pending, retry, exponential backoff, `next_attempt_at`, dan row lock `SKIP LOCKED`.

### Dashboard dan AI analytics

- Query agregasi dashboard digabung agar jumlah round-trip database berkurang.
- Cache dashboard berumur pendek dan diinvalidasi oleh realtime event.
- AI analytics memiliki permission dan rate limit per user.
- AI tetap read-only dan tidak memiliki tool write/approval/payment.

### Frontend dan mobile UX

- Sidebar desktop dipadukan dengan mobile drawer dan bottom navigation.
- Safe-area untuk perangkat iPhone/Android, touch target lebih besar, dan padding bawah untuk bottom nav.
- Form mobile menggunakan ukuran font yang mencegah auto-zoom iOS.
- Modal menjadi bottom sheet pada viewport kecil.
- Shared table memiliki mobile card view dan desktop table view.
- Sales Automation memiliki kartu monitoring mobile, filter full-width, status flow, outstanding payment, dan tombol konfirmasi yang mudah disentuh.
- Company profile memiliki mobile branch cards.
- Dashboard, AI report, settings, auth, company scope, pagination, dan shared module page disesuaikan untuk viewport kecil.
- Manifest dan ikon PWA-ready ditambahkan. Service worker/offline cache belum diaktifkan agar data ERP sensitif tidak tersimpan offline tanpa desain keamanan khusus.

### Data dan maintainability

- Administration tidak lagi memakai dummy data.
- Product dummy fallback otomatis mati di production.
- Duplicate auth refresh implementation dan security config lama dihapus.
- Error message penting memakai shared API error parser.
- Sales Automation mulai dipecah menjadi `form-utils`, `ui`, dan `monitoring-table`.
- Root Turbo yang tidak digunakan dihapus dari workflow package.

### CI dan quality gate

Updater menjalankan:

1. Checksum payload.
2. Backup source lama.
3. Docker build API dan frontend.
4. Alembic upgrade.
5. Python compileall.
6. Seluruh backend pytest.
7. Frontend TypeScript check.
8. ESLint.
9. Seluruh Vitest.
10. Next.js production build.
11. HTTP smoke test `/health`, `/ready`, dan `/login`.

## Endpoint command baru/utama

```text
POST /api/v1/realtime/ticket
POST /api/v1/finance/transactions/{id}/post
POST /api/v1/finance/transactions/{id}/void
POST /api/v1/finance/transactions/{id}/cancel
POST /api/v1/finance/invoices/{id}/send
POST /api/v1/finance/invoices/{id}/payments
POST /api/v1/finance/invoices/{id}/cancel
POST /api/v1/finance/journal-entries/{id}/post
POST /api/v1/finance/journal-entries/{id}/reverse
POST /api/v1/finance/tax-records/{id}/accrue
POST /api/v1/finance/tax-records/{id}/pay
POST /api/v1/finance/tax-records/{id}/report
POST /api/v1/finance/tax-records/{id}/cancel
POST /api/v1/finance/cash-accounts/{id}/adjust-balance
POST /api/v1/finance/reports/profit-loss/generate
POST /api/v1/finance/reports/cashflow/generate
POST /api/v1/finance/reports/balance-sheet/generate
```

## Environment baru

Periksa `.env.example` untuk nilai berikut:

```env
REALTIME_TICKET_TTL_SECONDS=45
REALTIME_ALLOW_QUERY_ACCESS_TOKEN=false
REALTIME_MAX_CONNECTIONS_PER_CHANNEL=100
REALTIME_MESSAGE_MAX_BYTES=16384
DASHBOARD_CACHE_TTL_SECONDS=20
OUTBOX_POLL_INTERVAL_SECONDS=2
OUTBOX_BATCH_SIZE=50
OUTBOX_MAX_ATTEMPTS=8
AI_RATE_LIMIT_PER_MINUTE=20
```

Environment development lama tetap berjalan dengan default yang aman. Untuk production, salin nilai yang relevan ke `.env`/secret manager.

## Catatan migration

Migration `8c9d0e1f2a34` bersifat additive:

- menambah permission dashboard/realtime/AI;
- menambah `next_attempt_at` pada outbox;
- menambah index dispatcher;
- menambah Finance check constraint dengan `NOT VALID` agar data legacy tidak menggagalkan deployment.

Data legacy sebaiknya dibersihkan dan constraint divalidasi pada maintenance window terpisah.

## PWA berikutnya

Paket ini baru **PWA-ready**, bukan full offline PWA. Tahap berikutnya sebaiknya:

- HTTPS production;
- service worker dengan network-first;
- tidak cache response Finance/HR/private file;
- install prompt;
- push notification permission;
- background sync hanya untuk command non-finansial yang idempotent;
- Android Trusted Web Activity atau Capacitor setelah security review.
