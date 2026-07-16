# DashAI Connected ERP Automation — Phase 1

## Tujuan

Phase ini menghubungkan flow Product, Sales, CRM, Finance, Tax, HR, Payroll,
Reporting, dan Excel Import tanpa mengubah domain rule lama yang sudah benar.
AI di halaman Settings disebut **AI Agent**, tetapi tetap read-only dan semua
write action tetap dijalankan oleh backend command/service dengan permission,
tenant scope, idempotency, dan audit event.

## Prinsip accounting utama

- Order diproses bukan berarti kas sudah diterima.
- Deal berstatus won bukan berarti kas sudah diterima.
- Invoice sent bukan berarti kas sudah diterima.
- Kas hanya berubah ketika transaksi diposting atau pembayaran dikonfirmasi.
- Laporan hanya menghitung transaksi berstatus `posted`.
- Record otomatis tidak boleh dihapus langsung; koreksi memakai cancel/void.

## Alur 1 — Product → Sales Order → Invoice → Tax → Cashflow

1. User membuat Sales Order.
2. Backend memvalidasi company, branch, produk, dan stok.
3. Ketika order diproses:
   - stok dikurangi melalui stock movement;
   - invoice `sent` dibuat;
   - transaksi pendapatan `draft` dibuat;
   - tax record `accrued` dibuat jika `tax_amount > 0`;
   - outbox event dibuat untuk monitoring dan realtime.
4. Belum ada perubahan saldo kas pada tahap fulfillment.
5. Ketika pembayaran dikonfirmasi:
   - active cash account dikunci;
   - saldo kas bertambah tepat satu kali;
   - invoice menjadi `paid`;
   - transaksi menjadi `posted`;
   - dashboard/cashflow/report ikut membaca nilai baru.

## Alur 2 — Invoice manual → Payment → Cashflow

1. Invoice dibuat sebagai `draft`.
2. Saat invoice dikirim, tax accrual otomatis dibuat jika terdapat pajak.
3. Saat payment direkam:
   - pembayaran tidak boleh melebihi outstanding;
   - cash account bertambah bila dipilih;
   - posted income transaction dibuat;
   - paid amount dan status invoice diperbarui;
   - event payment dicatat.

Invoice dari Sales Order tetap memakai command Sales Automation agar tidak ada
pembayaran ganda dari dua endpoint berbeda.

## Alur 3 — Expense → Cashflow → Report

1. Expense dibuat sebagai finance transaction `draft`.
2. Saat command post dijalankan:
   - cash account dikunci;
   - saldo kas berkurang;
   - transaction menjadi `posted`;
   - domain event `finance.transaction.posted` dicatat.
3. Cashflow bulanan/tahunan mengagregasi posted income, expense, refund, dan tax
   payment berdasarkan periode serta activity.
4. Void membalikkan dampak saldo kas; delete langsung tidak digunakan.

## Alur 4 — Invoice → Tax

1. Invoice dengan tax lebih dari nol memicu `ensure_invoice_tax_record`.
2. Sistem mencari tax record dengan company + invoice number + tax type.
3. Bila sudah ada, record lama dipakai agar tidak dobel.
4. Bila belum ada, sistem membuat PPN accrued menggunakan active tax rate jika
   tersedia dan nilai pajak invoice sebagai evidence.
5. Tax payment adalah command terpisah yang mengurangi cash account dan membuat
   posted tax-payment transaction.

## Alur 5 — Attendance + KPI → Payroll → Finance

1. Payroll Run menentukan company, branch, dan periode bulanan.
2. Sistem mengambil employee aktif dalam scope tersebut.
3. Sistem menghitung:
   - absence deduction dari jumlah hari absent;
   - lateness deduction dari jumlah hari late;
   - overtime dari overtime minutes;
   - KPI bonus dari approved KPI review yang overlap dengan periode.
4. Satu Payroll Slip dibuat per employee.
5. Total gross, deductions, tax, dan net disimpan pada Payroll Run.
6. Setelah calculated, satu draft expense transaction dibuat secara idempotent.
7. Cash belum berkurang hingga finance transaction diposting.

Default rule Phase 1:

- KPI ≥ 90: bonus 10% base salary.
- KPI ≥ 80: bonus 5%.
- KPI ≥ 70: bonus 2%.
- Di bawah 70: tanpa KPI bonus.
- Absent deduction: daily rate × absent days.
- Late deduction: 10% daily rate × late days.
- Overtime: hourly rate × 1.5 × overtime hours.
- Tax estimator sementara: 5% dari taxable pay.

Persentase ini adalah rule aplikasi, bukan klaim peraturan perpajakan resmi, dan
harus dibuat configurable pada phase selanjutnya.

## Alur 6 — CRM Deal Won → Settlement → Cashflow

1. Close Won menghitung ulang value dari deal items.
2. Sistem membuat satu draft income transaction dengan source `crm_deal`.
3. Deal won belum menambah saldo kas.
4. Confirm Payment:
   - hanya untuk won deal dengan linked draft transaction;
   - active cash account dikunci;
   - saldo kas bertambah;
   - transaction menjadi posted;
   - event settlement dicatat.

Flow ini sengaja tidak otomatis membuat invoice agar tidak menciptakan invoice
ganda ketika perusahaan menggunakan Sales Order sebagai sumber penagihan.
Phase berikutnya dapat menambah rule pilihan: `won -> invoice` atau
`won -> direct settlement`.

## Alur 7 — Excel Import

1. User memilih Excel/XLS/CSV pada module page.
2. Frontend membaca worksheet pertama.
3. Header dicocokkan dengan field key atau label form.
4. Setiap baris dikirim melalui create workflow module yang sudah ada.
5. Tenant, UUID, required field, permission, validation, dan idempotency tetap
   berlaku seperti input manual.
6. Data tidak lagi hanya ditambahkan ke state browser.

Phase ini diterapkan pada Product, HR, CRM, dan Finance. Import akun user dan
company tidak diaktifkan otomatis karena provisioning user/company membutuhkan
security flow dan password/invitation policy tersendiri.

## Rule catalog untuk AI Agent nanti

Endpoint:

```text
GET /api/v1/automation/rules
```

Rule catalog berisi:

- key;
- domain;
- trigger;
- actions;
- accounting effect;
- guardrails;
- visibility untuk AI.

AI Agent nanti boleh membaca catalog untuk memahami hubungan bisnis, tetapi
catalog ini bukan write tool. Agent tetap tidak boleh memposting transaksi,
mengubah stok, membayar invoice, atau menjalankan payroll tanpa approval flow.

## Perubahan UI

- Settings menampilkan mode **AI Agent**.
- Read-only dan human approval ditampilkan sebagai guardrail.
- RAG ditampilkan sebagai opsi persiapan, belum mengaktifkan ingestion.
- Automation page menjadi Connected ERP Automation.
- Rule cards menjelaskan trigger, accounting effect, dan aksi utama.
- Excel import menampilkan status loading/success/error.
- Layout tetap memakai style, responsive grid, dark mode, table, dan modal
  DashAI yang sudah ada.

## Hal yang sengaja tidak diubah

- JWT, refresh token, tenant scope, dan permission system.
- Generic list/read route yang sudah stabil.
- Existing finance post/void/cancel command.
- Existing outbox worker dan realtime listener.
- Existing report endpoints dan export PDF/Excel.
- AI Gemini read-only analytics endpoint.
- Existing Sales Automation idempotency source relation.

## Quality gate

```powershell
cd "D:\Documents\CODING\DashAI\DashAI"

docker compose build api frontend
docker compose up -d postgres redis api
docker compose exec -T api python -m alembic upgrade head
docker compose exec -T api python src/scripts/syntax_check.py
docker compose exec -T api python -m pytest -q -p no:cacheprovider
docker compose run --rm --no-deps frontend sh -lc "pnpm install --frozen-lockfile --prod=false && pnpm exec tsc --noEmit && pnpm lint && pnpm exec vitest run --reporter=default && pnpm build"
```

## Step berikutnya

1. Jalankan live integration tests untuk masing-masing flow.
2. Pindahkan payroll percentage menjadi company automation configuration.
3. Tambahkan report schedule dan generated report history.
4. Tambahkan bulk import job table untuk ribuan baris dan downloadable error file.
5. Tambahkan rule toggle per company tanpa membolehkan invariants kritis dimatikan.
6. Setelah automation stabil, bangun AI Agent tool registry read-only dari rule
   dan domain service ini.
