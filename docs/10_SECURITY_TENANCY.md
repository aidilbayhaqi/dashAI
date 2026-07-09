# Security and Multi-Tenancy

## 1. Tenant Isolation

Aturan utama:

```text
company_id dari authenticated context
bukan dari request body yang dipercaya mentah
```

Superadmin dapat memilih company melalui scoped control yang diaudit.

## 2. Authorization

Permission berbasis aksi:

```text
sales.order.create
sales.order.submit
sales.order.approve
inventory.goods_issue
finance.invoice.issue
finance.payment.receive
hr.payroll.calculate
hr.payroll.approve
tax.rule.manage
accounting.journal.post
```

## 3. Approval Separation

User yang membuat transaksi tidak boleh selalu menjadi approver.

Gunakan separation of duties untuk:

- purchase order;
- payroll;
- payment;
- tax rule;
- journal posting;
- stock adjustment.

## 4. File Security

Public:

- product image;
- company logo.

Private:

- transaction proof;
- payslip;
- contract;
- tax document;
- employee document.

Private file tidak boleh berada di static mount.

## 5. Audit

Tidak boleh hard delete untuk transaksi finansial yang sudah posted.

Gunakan:

```text
void
cancel
reverse
archive
```

## 6. AI Security

AI tool wajib memeriksa:

- actor;
- company;
- role;
- permission;
- target entity;
- state;
- amount limit;
- approval policy;
- idempotency key.

Prompt bukan sumber authorization.

## 7. Production Requirements

- HTTPS;
- secure cookie;
- CSRF strategy bila cookie auth dipakai untuk mutation;
- rate limiting;
- Redis auth;
- database least privilege;
- backup encrypted;
- secret rotation;
- no debug trace to user;
- security headers;
- dependency scanning.
