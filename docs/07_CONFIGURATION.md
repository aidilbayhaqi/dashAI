# Configuration

## 1. Environment

Jangan menyimpan secret ke Git.

File:

```text
.env
.env.development
.env.production
```

Yang boleh masuk Git:

```text
.env.example
```

## 2. Backend Environment

Contoh:

```env
ENVIRONMENT=development
DEBUG=false
LOG_LEVEL=INFO

DATABASE_URL=postgresql+asyncpg://dashai:password@postgres:5432/dashai

REDIS_HOST=redis
REDIS_PORT=6379
REDIS_DB=0
REDIS_PASSWORD=

JWT_SECRET=replace-with-long-random-secret
COOKIE_SECURE=false
CORS_ORIGINS=http://localhost:3000

UPLOAD_DIR=/app/uploads
ENABLE_REALTIME_LISTENER=false
```

## 3. Frontend Environment

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

Jangan menaruh private key di variable `NEXT_PUBLIC_*`.

## 4. Business Settings

Business settings harus disimpan per company.

```text
company_settings
sales_settings
inventory_settings
finance_settings
hr_settings
tax_settings
automation_settings
```

Contoh `sales_settings`:

```json
{
  "invoice_trigger": "on_goods_issue_completed",
  "allow_partial_delivery": true,
  "allow_negative_stock": false,
  "require_sales_order_approval": true,
  "default_payment_term_days": 30
}
```

Contoh `inventory_settings`:

```json
{
  "valuation_method": "weighted_average",
  "auto_reorder_enabled": true,
  "auto_purchase_order_enabled": false,
  "default_warehouse_id": "uuid"
}
```

Contoh `payroll_settings`:

```json
{
  "attendance_cutoff_day": 25,
  "pay_day": 28,
  "kpi_bonus_enabled": true,
  "overtime_requires_approval": true,
  "unpaid_leave_deduction_enabled": true
}
```

Contoh `tax_settings`:

```json
{
  "default_sales_tax_profile_id": "uuid",
  "default_purchase_tax_profile_id": "uuid",
  "price_includes_tax": false,
  "rounding_mode": "HALF_UP"
}
```

## 5. Feature Flags

Gunakan feature flag untuk rollout aman:

```text
sales_automation_enabled
automatic_invoice_enabled
automatic_journal_enabled
kpi_payroll_enabled
tax_engine_v2_enabled
ai_agent_enabled
ai_action_proposals_enabled
```

## 6. Secret Policy

Production wajib:

- secret random panjang;
- cookie secure;
- HTTPS;
- trusted proxy configuration;
- database password terpisah;
- Redis password;
- secret rotation;
- no default admin password.
