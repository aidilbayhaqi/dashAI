# Domain Event Contracts

## 1. Envelope

Semua event menggunakan envelope:

```json
{
  "event_id": "uuid",
  "event_type": "sales.order.approved",
  "event_version": 1,
  "company_id": "uuid",
  "entity_type": "sales_order",
  "entity_id": "uuid",
  "occurred_at": "ISO-8601",
  "actor_user_id": "uuid",
  "correlation_id": "uuid",
  "causation_id": "uuid|null",
  "payload": {}
}
```

## 2. Sales Events

```text
crm.deal.won
sales.quotation.accepted
sales.order.submitted
sales.order.approved
sales.order.rejected
sales.stock.reserved
sales.goods.issued
sales.delivery.confirmed
sales.order.invoiced
sales.order.closed
```

## 3. Inventory Events

```text
inventory.stock.reserved
inventory.reservation.released
inventory.goods.issued
inventory.goods.received
inventory.stock.adjusted
inventory.stock_below_reorder_point
inventory.negative_stock_blocked
```

## 4. Finance Events

```text
finance.invoice.drafted
finance.invoice.issued
finance.invoice.overdue
finance.payment.received
finance.payment.allocated
finance.credit_note.issued
finance.vendor_bill.approved
finance.cashflow.updated
```

## 5. Accounting Events

```text
accounting.journal.created
accounting.journal.posted
accounting.journal.reversed
accounting.period.soft_closed
accounting.period.hard_closed
```

## 6. HR Events

```text
hr.employee.activated
hr.attendance.period_closed
hr.leave.approved
hr.kpi.finalized
hr.payroll.calculated
hr.payroll.approved
hr.payroll.paid
hr.payslip.generated
```

## 7. Tax Events

```text
tax.rule.created
tax.rule.activated
tax.calculated
tax.snapshot.created
tax.liability.updated
```

## 8. Procurement Events

```text
procurement.purchase_request.created
procurement.purchase_request.approved
procurement.purchase_order.issued
procurement.goods.received
procurement.vendor_bill.created
procurement.vendor_payment.completed
```

## 9. Handler Matrix

| Event | Handler | Output |
|---|---|---|
| `crm.deal.won` | Sales draft handler | Draft sales order |
| `sales.order.approved` | Inventory reservation | Reservation |
| `sales.goods.issued` | Invoice handler | Invoice |
| `sales.goods.issued` | Accounting COGS handler | Journal |
| `finance.invoice.issued` | AR posting handler | Receivable + journal |
| `finance.payment.received` | Allocation handler | Updated outstanding |
| `inventory.stock_below_reorder_point` | Procurement handler | Draft purchase request |
| `hr.payroll.approved` | Payroll accounting handler | Payable journal |
| `tax.rule.activated` | Tax cache invalidation | Refreshed rule cache |

## 10. Versioning

Event payload tidak boleh diubah secara breaking tanpa menaikkan:

```text
event_version
```

Consumer lama harus tetap dapat memproses event versi sebelumnya.
