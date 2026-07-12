# DashAI Fix Problem 1 dan 2

## Scope

Patch ini memperbaiki dua temuan audit:

1. Realtime event sebelumnya dibroadcast ke semua channel sehingga berisiko bocor antar-company.
2. Dashboard frontend masih memakai data dummy dan belum terhubung ke API serta realtime.

## Perubahan utama

### Backend realtime

- Channel company dinormalisasi menjadi `company:<company_id>`.
- User biasa selalu dikunci ke `company_id` dari access token.
- Query parameter `company_id` tidak dapat dipakai user biasa untuk berpindah tenant.
- Superuser dapat memilih satu company melalui query parameter atau memakai channel `global` untuk semua company.
- Event company hanya dikirim ke channel company tersebut dan channel global superuser.
- Event tanpa company context hanya dikirim ke channel global.
- Listener Redis sekarang menolak payload malformed tanpa menghentikan listener.
- Ditambahkan unit test isolasi antar-company.

### Frontend dashboard

- Dashboard mengambil data dari `GET /api/v1/dashboard/summary`.
- Company scope ikut dikirim untuk superuser ketika company tertentu dipilih.
- React Query menangani cache, loading, retry, refresh, dan fallback polling 60 detik.
- WebSocket memiliki heartbeat dan reconnect bertahap.
- Event realtime meng-invalidasi cache dashboard agar data langsung di-fetch ulang.
- Seluruh angka dummy, revenue trend dummy, customer segment dummy, module health dummy, dan operational queue dummy dihapus.
- Grafik dan tabel sekarang dibentuk dari response API aktual.
- Dashboard memiliki loading skeleton, error state, manual refresh, status realtime, dan layout responsive.

## File diubah

- `apps/backend/src/realtime/manager.py`
- `apps/backend/src/realtime/router_realtime.py`
- `apps/backend/src/realtime/listener.py`
- `apps/frontend/app/(dashboard)/dashboard/page.tsx`

## File baru

- `apps/backend/src/tests/test_realtime_tenant_isolation.py`
- `apps/frontend/features/dashboard/types.ts`
- `apps/frontend/features/dashboard/api.ts`
- `apps/frontend/features/dashboard/hook.ts`
- `apps/frontend/features/dashboard/realtime.ts`
- `apps/frontend/features/dashboard/api.test.ts`
- `run_fix_problem_1_2.ps1`

## Menjalankan validasi

Dari root project:

```powershell
Set-ExecutionPolicy -Scope Process Bypass
.\run_fix_problem_1_2.ps1
```

Tanpa rebuild image:

```powershell
.\run_fix_problem_1_2.ps1 -SkipBuild
```

Tanpa menjalankan test khusus:

```powershell
.\run_fix_problem_1_2.ps1 -SkipTests
```

## Catatan batas scope

Patch ini belum mengubah definisi bisnis `total_revenue` pada backend. Nilainya masih mengikuti kalkulasi endpoint dashboard yang sudah ada. Penyaringan revenue berdasarkan transaction type/status merupakan problem audit berikutnya.
