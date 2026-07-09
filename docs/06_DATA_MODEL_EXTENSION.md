# Data Model Extension

Berikut tabel tambahan yang disarankan agar ERP mendukung flow bisnis dan automation.

## 1. Sales

```text
quotations
quotation_items
sales_orders
sales_order_items
sales_order_status_history
deliveries
delivery_items
goods_issues
goods_issue_items
```

Field penting `sales_orders`:

```text
id
company_id
customer_id
quotation_id
order_no
order_date
status
currency
subtotal
discount_total
tax_total
grand_total
payment_term_id
invoice_trigger
agreement_confirmed_at
approved_at
approved_by
version
created_at
updated_at
```

## 2. Inventory

```text
warehouses
inventory_balances
inventory_reservations
stock_movements
stock_movement_items
stock_adjustments
reorder_policies
stock_valuation_layers
```

Gunakan ledger stock, bukan hanya update quantity.

```text
stock_on_hand =
  total_receipts
  - total_issues
  + adjustments

available_stock =
  stock_on_hand
  - reserved_stock
```

## 3. Procurement

```text
suppliers
purchase_requests
purchase_request_items
purchase_orders
purchase_order_items
goods_receipts
goods_receipt_items
vendor_bills
vendor_bill_items
```

## 4. Finance and Accounting

```text
chart_of_accounts
journal_entries
journal_lines
accounting_periods
payments
payment_allocations
receivables
payables
credit_notes
debit_notes
bank_accounts
bank_reconciliations
```

Constraint penting:

```text
sum(debit) = sum(credit)
```

## 5. Tax

```text
tax_profiles
tax_rules
tax_rule_components
transaction_tax_snapshots
tax_lines
tax_periods
tax_liabilities
```

## 6. HR and Payroll

```text
employment_contracts
salary_structures
salary_components
attendance_periods
attendance_summaries
kpi_periods
kpi_results
performance_policies
payroll_runs
payroll_items
payroll_item_components
payslips
employee_loans
employee_reimbursements
```

## 7. Approval

```text
approval_policies
approval_policy_steps
approval_requests
approval_steps
approval_actions
```

## 8. Automation

```text
automation_rules
workflow_definitions
workflow_states
workflow_transitions
workflow_instances
workflow_history
scheduled_jobs
outbox_events
processed_events
dead_letter_events
```

## 9. Audit and Numbering

```text
audit_logs
document_sequences
document_number_reservations
system_settings
business_rule_versions
```

## 10. Tenant Rules

Semua tabel bisnis wajib memiliki:

```text
company_id
```

Pengecualian hanya untuk master global yang benar-benar immutable.

Index minimum:

```text
(company_id, id)
(company_id, status)
(company_id, created_at)
(company_id, document_no)
```

Unique constraint selalu tenant-aware:

```text
UNIQUE(company_id, invoice_no)
```

bukan:

```text
UNIQUE(invoice_no)
```
