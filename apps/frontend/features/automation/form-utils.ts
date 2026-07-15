import type { SalesOrderLineInput } from "./types";

export type AutomationFormLine = SalesOrderLineInput & { localId: string };

function createLocalId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `line-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function makeAutomationLine(): AutomationFormLine {
  return {
    localId: createLocalId(),
    product_id: "",
    quantity: "1",
    unit_price: "",
    discount_amount: "0",
    tax_amount: "0",
  };
}
