import {
  ChartNoAxesCombined,
  Contact,
  HandCoins,
  Megaphone,
  ShoppingBasket,
} from "lucide-react";
import type { ModuleConfig } from "@/types/modules";
import type { CRMModuleKey } from "./types";

export const crmModuleConfig: Record<CRMModuleKey, ModuleConfig> = {
  overview: {
    badge: "Customers / Sales",
    title: "CRM Overview",
    description:
      "Kelola leads, customer, pipeline, campaign, dan follow-up sales berbasis data.",
    icon: Contact,
    columns: [
      { key: "lead", label: "Lead" },
      { key: "company", label: "Company" },
      { key: "value", label: "Value" },
      { key: "stage", label: "Stage" },
      { key: "status", label: "Status" },
    ],
  },

  leads: {
    badge: "Customers / Leads",
    title: "Leads",
    description: "Kelola prospek, lead scoring, source, dan prioritas follow-up.",
    icon: ShoppingBasket,
    columns: [
      { key: "name", label: "Name" },
      { key: "source", label: "Source" },
      { key: "score", label: "Score" },
      { key: "owner", label: "Owner" },
      { key: "status", label: "Status" },
    ],
  },

  customers: {
    badge: "Customers / Database",
    title: "Customers",
    description:
      "Kelola database pelanggan, segmentasi, nilai transaksi, dan engagement.",
    icon: HandCoins,
    columns: [
      { key: "customer", label: "Customer" },
      { key: "segment", label: "Segment" },
      { key: "revenue", label: "Revenue" },
      { key: "lastActivity", label: "Last Activity" },
      { key: "status", label: "Status" },
    ],
  },

  pipeline: {
    badge: "Customers / Pipeline",
    title: "Pipeline",
    description: "Monitor deal stage, value, probability, dan forecasting revenue.",
    icon: ChartNoAxesCombined,
    columns: [
      { key: "deal", label: "Deal" },
      { key: "client", label: "Client" },
      { key: "value", label: "Value" },
      { key: "stage", label: "Stage" },
      { key: "status", label: "Status" },
    ],
  },

  campaigns: {
    badge: "Customers / Campaigns",
    title: "Campaigns",
    description:
      "Kelola campaign marketing, channel, budget, dan performa konversi.",
    icon: Megaphone,
    columns: [
      { key: "campaign", label: "Campaign" },
      { key: "channel", label: "Channel" },
      { key: "budget", label: "Budget" },
      { key: "leads", label: "Leads" },
      { key: "status", label: "Status" },
    ],
  },
};