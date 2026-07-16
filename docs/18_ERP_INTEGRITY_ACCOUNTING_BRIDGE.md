# ERP Integrity & Accounting Bridge

## Tujuan

Patch ini mengunci alur ERP supaya satu kejadian bisnis hanya memiliki satu
jalur perubahan state. Transaksi otomatis tidak lagi dapat diposting lewat
command Finance generik, seluruh pembayaran kas memiliki jurnal berimbang, dan
scope branch diterapkan pada custom automation command.

## Prinsip utama

```text
Order / deal / payroll calculation
→ membuat dokumen dan kewajiban/piutang
→ belum mengubah kas
→ pembayaran dilakukan melalui source-specific command
→ kas, transaction, invoice/payroll, journal, outbox, dan laporan berubah
  dalam satu database transaction
```

## Sales Order

```text
Create / Process Sales Order
→ validasi tenant dan branch
→ lock stock
→ stock movement
→ invoice sent
→ tax accrued
→ Finance income transaction draft
→ journal invoice: Dr AR, Cr Revenue, Cr Tax Payable
→ journal COGS: Dr COGS, Cr Inventory

Confirm Payment
→ lock order, invoice, transaction, cash account
→ invoice paid
→ Finance transaction posted
→ cash account bertambah
→ journal payment: Dr Cash, Cr AR
→ idempotent event
```

Generic `Post Transaction`, `Cancel`, dan `Void` ditolak untuk source
`sales_order`.

## CRM Deal

```text
Close Won
→ value dihitung dari deal items
→ invoice sent dibuat
→ tax accrued
→ Finance income transaction draft
→ invoice journal diposting
→ deal menyimpan invoice_id dan finance_transaction_id

Confirm Payment
→ cash bertambah
→ invoice paid
→ transaction posted
→ payment journal
```

Stage `won` dan `lost` tidak dapat diubah melalui generic CRUD. Closed deal dan
deal yang sudah terhubung Finance juga tidak dapat dihapus.

## Payroll

```text
Draft Payroll Run
→ attendance seluruh workday harus lengkap
→ latest approved KPI dipakai
→ calculate gross, deduction, overtime, bonus, tax, net
→ payroll slips
→ Finance payment transaction draft
→ accrual journal: Dr Salary Expense, Cr Payroll Payable, Cr Tax Payable

Pay Payroll
→ lock payroll, transaction, cash account
→ cash berkurang
→ transaction posted
→ payroll paid
→ payment journal: Dr Payroll Payable, Cr Cash
```

Status dan nilai payroll tidak dapat dimanipulasi melalui generic CRUD.
Generic Finance Post juga ditolak untuk source `hr_payroll`.

## Invoice dan Tax

```text
Invoice Sent
→ tax record dibuat dengan invoice_id
→ unique(company_id, invoice_id, tax_type)
→ PostgreSQL ON CONFLICT mencegah duplicate tax pada request paralel
→ invoice issue journal

Invoice Payment
→ wajib menggunakan cash account aktif/default
→ cash bertambah
→ payment transaction posted
→ invoice paid/partially paid
→ payment journal
```

Invoice milik Sales Order atau CRM harus dibayar melalui workflow sumbernya.

## Expense, Tax Payment, dan Cash Adjustment

```text
Expense Post
→ cash berkurang
→ transaction posted
→ Dr Expense, Cr Cash

Tax Pay
→ cash berkurang
→ tax record paid
→ Dr Tax Payable, Cr Cash

Cash Adjustment
→ controlled command
→ adjustment transaction posted
→ increase: Dr Cash, Cr Equity
→ decrease: Dr Equity, Cr Cash
```

Generic posting untuk `transfer`, `tax_payment`, dan `adjustment` diblok karena
ketiganya membutuhkan command khusus agar tidak menghasilkan state setengah.

## Default Cash Account

Setiap company hanya dapat memiliki satu `is_default=true` melalui unique
partial index. Automation memilih default account terlebih dahulu, kemudian
fallback ke active account tertua jika belum dikonfigurasi.

## Branch isolation

Custom list dan command berikut sekarang menerima `allowed_branch_ids`:

- Sales Order list/detail/process/payment;
- automation monitoring dan events;
- Finance transaction commands;
- invoice commands;
- journal commands yang terhubung transaction;
- tax commands yang terhubung invoice/transaction.

Resource di luar branch user dikembalikan sebagai `404`.

## Excel import

Import tetap memakai create workflow backend per row. Perubahan:

```text
parse file
→ process semua row secara sequential
→ row gagal tidak menghentikan row berikutnya
→ tampilkan success/failed count
→ unduh Failed Rows.xlsx berisi nomor baris, error, dan data asli
```

Import tidak membypass tenant, permission, schema validation, atau idempotency
backend.

## Laporan

```text
Cashflow
→ posted Finance transactions

P&L / Balance Sheet / Ledger
→ posted balanced journals
```

Accounting bridge memastikan invoice, payment, COGS, expense, payroll, tax, dan
cash adjustment menghasilkan jurnal. Dengan demikian cashflow dan accrual
reports berasal dari event bisnis yang sama.

## AI Agent boundary

AI Agent tetap read-only. Rule catalog diperbarui agar AI memahami lifecycle
baru, tetapi AI tidak memperoleh tool untuk posting, pembayaran, perubahan
stock, payroll approval, atau tax payment.

## Hal yang sengaja belum diaktifkan otomatis

Beberapa keputusan membutuhkan konfigurasi bisnis/legal dan tidak boleh
ditebak oleh patch:

- formula PPh/BPJS resmi;
- kalender hari libur dan shift per company;
- jadwal closing bulanan/tahunan;
- transfer antar rekening;
- reversal Deal Won dan Sales Order setelah fulfillment;
- AI write action.

Workflow tersebut tetap diblok atau manual sampai company configuration dan
approval policy tersedia.
