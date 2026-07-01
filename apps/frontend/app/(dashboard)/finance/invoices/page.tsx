// app/(dashboard)/finance/invoices/page.tsx
import { FinanceModuleClient } from "@/features/finance/client";

export default function FinanceInvoicesPage() {
  return <FinanceModuleClient moduleKey="invoices" />;
}