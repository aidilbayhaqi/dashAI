# Business Flows yang Perlu Ditambahkan

## Prioritas Tinggi

### 1. Lead-to-Cash

CRM sampai pembayaran.

```text
Lead -> Opportunity -> Quotation -> Sales Order
-> Delivery -> Invoice -> Payment -> Close
```

### 2. Procure-to-Pay

Kebutuhan barang sampai pembayaran supplier.

```text
Reorder / Request -> Purchase Request -> Approval
-> Purchase Order -> Receipt -> Vendor Bill -> Payment
```

### 3. Record-to-Report

Semua transaksi sampai laporan keuangan.

```text
Source Transaction -> Journal -> Ledger
-> Reconciliation -> Period Close -> Financial Statements
```

### 4. Hire-to-Retire

```text
Recruitment -> Employee -> Contract -> Attendance
-> Performance -> Payroll -> Promotion/Transfer -> Exit
```

### 5. Expense-to-Reimbursement

```text
Expense Claim -> Review -> Approval -> Reimbursement -> Journal
```

## Prioritas Menengah

### 6. Return-to-Refund

- sales return;
- purchase return;
- credit note;
- debit note;
- refund;
- stock adjustment.

### 7. Budget-to-Control

- annual budget;
- department budget;
- commitment;
- actual;
- variance;
- approval limit.

### 8. Asset Lifecycle

```text
Asset Acquisition -> Capitalization -> Depreciation
-> Maintenance -> Transfer -> Disposal
```

### 9. Bank Reconciliation

```text
Bank Statement -> Matching -> Difference Review -> Adjustment
```

### 10. Credit Control

- customer credit limit;
- overdue blocking;
- payment terms;
- risk score;
- approval override.

## Prioritas Lanjutan

### 11. Manufacturing

Bila dibutuhkan:

- bill of materials;
- production order;
- material issue;
- work in progress;
- finished goods receipt;
- manufacturing cost.

### 12. Subscription and Recurring Billing

- contract;
- recurring schedule;
- usage;
- recurring invoice;
- renewal;
- cancellation.

### 13. Service Management

- work order;
- technician assignment;
- SLA;
- spare parts;
- completion;
- invoice.

## Cross-Cutting Flow

Semua flow di atas membutuhkan:

- approval;
- document numbering;
- attachments;
- comments;
- notification;
- audit;
- tenant scope;
- journal posting;
- tax calculation;
- idempotency;
- period lock.
