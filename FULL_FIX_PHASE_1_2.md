# DashAI Full Fix — Phase 1 + Read-only AI Analytics Phase 2

Tanggal: 12 Juli 2026

## Ringkasan

Paket ini menggabungkan perbaikan keamanan realtime, kontrak dashboard yang typed, integrasi React Query dan WebSocket, responsive application shell, refactor shared frontend, parser angka lokal, error handling yang lebih jujur, serta AI analytics read-only.

Perubahan dirancang agar tetap kompatibel dengan field dashboard lama. Tidak ada migration database baru dalam paket ini.

## 1. Realtime tenant isolation

- Channel WebSocket dipisahkan menjadi `company:<company_id>` dan `global`.
- User non-superuser selalu memakai `company_id` dari access token dan tidak dapat mengganti tenant melalui query parameter.
- Channel global hanya digunakan oleh superuser.
- Event company hanya dikirim ke company terkait dan channel global superuser.
- Jumlah koneksi per channel dan timeout pengiriman dibatasi.
- Socket bersifat read-only; client hanya diperbolehkan mengirim heartbeat `ping`.
- Origin, access token, token type, dan blacklist token diperiksa sebelum koneksi diterima.

## 2. Redis/WebSocket listener hardening

- Event memakai envelope Pydantic `RealtimeEvent` dengan `event_id`, `schema_version`, `type`, `module`, `company_id`, `payload`, dan `published_at`.
- UUID, Decimal, Enum, serta tanggal diserialisasi secara JSON-safe.
- Frame invalid atau terlalu besar diabaikan tanpa mematikan listener.
- Event duplicate didedup berdasarkan `event_id` dan TTL.
- Redis listener reconnect dengan exponential backoff.
- Kegagalan publish realtime tidak membatalkan transaksi database yang sudah berhasil di-commit.
- Endpoint terautentikasi `GET /api/v1/realtime/health` menyediakan status listener dan jumlah koneksi.

## 3. Dashboard API contract

Endpoint:

```text
GET /api/v1/dashboard/summary
```

Contract `2026-07` mencakup:

- tenant/branch scope;
- periode aktif dan periode pembanding;
- posted income, posted expense, dan net cashflow;
- produk dan low stock;
- employee aktif;
- lead/deal dan pipeline value;
- outstanding dan overdue invoice;
- failed automation events;
- cashflow time-series;
- CRM pipeline breakdown;
- operational alerts.

Revenue hanya menghitung transaksi `INCOME` berstatus `POSTED`. Expense hanya menghitung transaksi `EXPENSE` berstatus `POSTED`. Window pembanding memiliki jumlah hari yang sama dengan periode aktif.

## 4. Dashboard frontend

- Fetch menggunakan React Query dengan query key berdasarkan company dan periode.
- Loading, error, refresh, retry policy, polling fallback, dan focus refetch tersedia.
- WebSocket hook memiliki heartbeat, reconnect backoff, jitter, online/offline handling, dan visibility handling.
- Event realtime menginvalidasi query dashboard, AI report, dan module terkait.
- Semua KPI/chart/alert berasal dari backend; data dummy dihapus.

## 5. Responsive UI dan refactor

- Sidebar menjadi desktop fixed sidebar + mobile drawer.
- Topbar dan content shell tidak lagi overflow pada viewport kecil.
- Record modal menjadi bottom sheet pada mobile dan dialog pada desktop.
- Tabel module memiliki desktop table dan mobile card representation.
- `record-modal.tsx` dipecah menjadi field, lookup, upload, type, dan helper components.
- Metric card dan module table dipisahkan dari `module-page.tsx`.
- Company create section dan register controls mulai dipisahkan menjadi feature components.
- Dua file shared lama yang tidak lagi direferensikan dihapus:
  - `apps/frontend/config/module-page.tsx`
  - `apps/frontend/lib/module-data.ts`

Refactor sengaja difokuskan pada shared UI dan alur berisiko tinggi. Beberapa halaman domain yang besar masih dapat dipecah pada iterasi lanjutan tanpa mengubah bisnis logic sekaligus.

## 6. Parser angka dan error handling

Parser baru mendukung format umum Indonesia dan internasional:

```text
1.000       -> 1000
1.000,50    -> 1000.5
1,000.50    -> 1000.5
12,5        -> 12.5
Rp 2.500.000 -> 2500000
(1.250,25)  -> -1250.25
```

Error API `401`, `403`, `422`, `500`, timeout, dan network error tidak lagi selalu disamarkan sebagai array kosong. Lookup hanya mencoba fallback endpoint untuk response yang memang menunjukkan endpoint/shape tidak tersedia.

## 7. AI analytics Phase 2 — read-only

Endpoint:

```text
GET  /api/v1/ai/analytics/summary
POST /api/v1/ai/analytics/ask
```

Karakteristik:

- memakai scope company/branch dan agregat dashboard yang sama;
- rules engine tetap bekerja tanpa API key;
- menghasilkan health score, findings, recommendations, evidence, dan suggested links;
- tidak memiliki write tool, database mutation, approval, payment action, atau automation execution;
- optional provider hanya memperbaiki narasi jawaban dan menerima JSON agregat, bukan raw table dump;
- saat provider gagal, response rules tetap dikembalikan.

Konfigurasi optional:

```env
AI_ENABLE_PROVIDER=false
OPENAI_API_KEY=
AI_MODEL=
AI_MAX_QUESTION_LENGTH=600
```

Untuk mengaktifkan provider, isi key/model dan ubah `AI_ENABLE_PROVIDER=true`. Mode endpoint tetap read-only.

## 8. Quality gates

Script `run_dashai_full_fix_checks.ps1` menjalankan:

1. `docker compose config --quiet`;
2. build image API dan frontend;
3. start API beserta dependency Postgres/Redis;
4. backend syntax check;
5. seluruh backend pytest suite;
6. frontend install, TypeScript `tsc --noEmit`, seluruh Vitest suite, dan Next.js production build dalam one-off container;
7. start frontend;
8. smoke test `/health`, `/ready`, dan `/login`;
9. menampilkan status container.

## 9. Menjalankan patch dari root DashAI

Extract ZIP patch ke Downloads. Dari PowerShell yang sedang berada di root project:

```powershell
powershell -ExecutionPolicy Bypass `
  -File "D:\Downloads\DashAI-Full-Fix-Patch\apply_dashai_full_fix.ps1" `
  -ProjectRoot $PWD
```

Hanya menerapkan file tanpa Docker validation:

```powershell
powershell -ExecutionPolicy Bypass `
  -File "D:\Downloads\DashAI-Full-Fix-Patch\apply_dashai_full_fix.ps1" `
  -ProjectRoot $PWD `
  -ApplyOnly
```

Menjalankan ulang quality gates dari root project:

```powershell
powershell -ExecutionPolicy Bypass `
  -File ".\run_dashai_full_fix_checks.ps1" `
  -ProjectRoot $PWD
```

## 10. Backup dan rollback

Sebelum menimpa atau menghapus file, updater menyimpan file lama ke:

```text
.patch-backups/full-fix-YYYYMMDD-HHMMSS/
```

Folder backup mempertahankan relative path. Untuk rollback, copy isi folder backup kembali ke root project. File yang baru ditambahkan oleh patch dan tidak terdapat dalam backup perlu dihapus berdasarkan `files-manifest.txt` pada ZIP patch.

## 11. Catatan keamanan dan batasan

- Access token WebSocket masih berada pada query string karena WebSocket browser tidak dapat mengirim arbitrary authorization header. Gunakan HTTPS/WSS dan hindari logging query string pada reverse proxy. Evolusi berikutnya yang lebih kuat adalah short-lived WebSocket ticket.
- AI ini adalah analytics agent read-only, bukan autonomous workflow agent dan bukan RAG dokumen. Qdrant belum diwajibkan oleh endpoint ini.
- Provider AI tidak boleh dianggap sebagai sumber kebenaran; backend KPI contract tetap evidence utama.
