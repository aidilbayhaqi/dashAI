# Product-to-Cash Business Automation

## Scope pertama

Flow ini menghubungkan Product, Stock, Sales Order, Finance Transaction,
Invoice, dan Domain Event dalam satu transaksi database.

```text
Product + Stock
    ↓
Sales Order
    ↓
Stock validation and fulfillment
    ↓
Posted income transaction
    ↓
Sent invoice
    ↓
Domain event timeline
```

## Mode penggunaan

### Automatic

`auto_process=true` membuat Sales Order dan langsung menjalankan seluruh flow.

### Manual approval

`auto_process=false` menyimpan Sales Order sebagai draft. Pengguna kemudian
menjalankan endpoint process atau tombol **Process draft automatically** di UI.

Input manual Finance tetap tersedia. Record manual memakai
`creation_mode=manual`, sedangkan record yang dibuat flow memakai
`creation_mode=automatic` dan source:

```text
source_module = sales_order
source_id     = <sales_order_id>
```

## Endpoint

```text
POST /api/v1/automation/sales-orders
GET  /api/v1/automation/sales-orders
GET  /api/v1/automation/sales-orders/{id}
POST /api/v1/automation/sales-orders/{id}/process
GET  /api/v1/automation/events
```

POST create dan process wajib memakai `Idempotency-Key`.

## Atomicity

Stok, stock movement, transaction, invoice, order status, dan events ditulis
dalam satu database transaction. Jika stok tidak cukup, seluruh flow rollback.

## Idempotency

- Request key yang sama mengembalikan response yang sama dari Redis.
- Process order yang sudah fulfilled mengembalikan hasil lama.
- Unique source index mencegah transaction dan invoice ganda.
- Unique stock movement source mencegah pengurangan stok ganda.
- Unique `event_key` mencegah domain event ganda.

## Frontend

Halaman:

```text
/sales-orders
```

Menyediakan:

- form Sales Order multi-item;
- harga default dari Product;
- indikator available stock per branch;
- estimasi total;
- pilihan auto process atau draft;
- result Sales Order, Transaction, dan Invoice;
- domain event timeline realtime melalui polling API.

## Testing

```powershell
docker compose `
  -f docker-compose.yml `
  -f docker-compose.hardened.yml `
  exec -T -w /app -e PYTHONPATH=/app api `
  python -m pytest `
  src/tests/test_30_sales_order_automation.py `
  src/tests/test_31_invoice_automation.py `
  src/tests/test_32_business_event_outbox.py `
  src/tests/test_33_automation_idempotency.py `
  -q -p no:cacheprovider
```

Manual smoke test:

```powershell
powershell -ExecutionPolicy Bypass `
  -File .\scripts\test-business-automation.ps1
```
