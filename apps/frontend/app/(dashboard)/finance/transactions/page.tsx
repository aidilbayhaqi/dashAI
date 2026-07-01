// app/(dashboard)/finance/page.tsx
import { FinanceModuleClient } from "@/features/finance/client";

export default function FinanceTransactionsPage() {
  return <FinanceModuleClient moduleKey="transactions" />;
}