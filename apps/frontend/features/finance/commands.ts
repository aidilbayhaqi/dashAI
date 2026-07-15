import { api } from "@/lib/api";
import {
  clearIdempotencyKey,
  idempotencyHeaders,
  retainIdempotencyKey,
} from "@/lib/idempotency";
import type { ModuleRow } from "@/types/modules";

async function runCommand(
  operation: string,
  url: string,
  companyId: string,
  payload: Record<string, unknown> = {},
): Promise<ModuleRow> {
  const fingerprint = { url, companyId, payload };
  const idempotency = idempotencyHeaders(operation, fingerprint);
  try {
    const response = await api.post<ModuleRow>(url, payload, {
      params: { company_id: companyId },
      headers: idempotency.headers,
    });
    retainIdempotencyKey(operation, fingerprint, idempotency.key);
    return response.data;
  } catch (error) {
    clearIdempotencyKey(operation, fingerprint, idempotency.key);
    throw error;
  }
}

export function postTransaction(id: string, companyId: string) {
  return runCommand("finance.transaction.post", `/api/v1/finance/transactions/${id}/post`, companyId);
}

export function voidTransaction(id: string, companyId: string) {
  return runCommand("finance.transaction.void", `/api/v1/finance/transactions/${id}/void`, companyId);
}

export function cancelTransaction(id: string, companyId: string) {
  return runCommand("finance.transaction.cancel", `/api/v1/finance/transactions/${id}/cancel`, companyId);
}

export function sendInvoice(id: string, companyId: string) {
  return runCommand("finance.invoice.send", `/api/v1/finance/invoices/${id}/send`, companyId);
}

export function payInvoice(id: string, companyId: string) {
  return runCommand("finance.invoice.payment", `/api/v1/finance/invoices/${id}/payments`, companyId);
}

export function cancelInvoice(id: string, companyId: string) {
  return runCommand("finance.invoice.cancel", `/api/v1/finance/invoices/${id}/cancel`, companyId);
}

export function postJournal(id: string, companyId: string) {
  return runCommand("finance.journal.post", `/api/v1/finance/journal-entries/${id}/post`, companyId);
}

export function reverseJournal(id: string, companyId: string) {
  return runCommand("finance.journal.reverse", `/api/v1/finance/journal-entries/${id}/reverse`, companyId);
}


export function accrueTaxRecord(id: string, companyId: string) {
  return runCommand("finance.tax.accrue", `/api/v1/finance/tax-records/${id}/accrue`, companyId);
}

export function payTaxRecord(id: string, companyId: string) {
  return runCommand("finance.tax.pay", `/api/v1/finance/tax-records/${id}/pay`, companyId);
}

export function reportTaxRecord(id: string, companyId: string) {
  return runCommand("finance.tax.report", `/api/v1/finance/tax-records/${id}/report`, companyId);
}

export function cancelTaxRecord(id: string, companyId: string) {
  return runCommand("finance.tax.cancel", `/api/v1/finance/tax-records/${id}/cancel`, companyId);
}

export function generateCashflow(payload: ModuleRow, companyId: string) {
  return runCommand("finance.report.cashflow", "/api/v1/finance/reports/cashflow/generate", companyId, payload);
}
