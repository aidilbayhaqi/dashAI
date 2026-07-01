import type { ModuleData } from "@/types/modules";
import type { CRMModuleKey } from "./types";

export const crmDummyData: Record<CRMModuleKey, ModuleData> = {
  overview: {
    metrics: [
      {
        label: "Active Leads",
        value: "184",
        helper: "27 leads masuk minggu ini",
        trend: "+14.3%",
      },
      {
        label: "Conversion Rate",
        value: "18.6%",
        helper: "+4.2% dibanding bulan lalu",
      },
      {
        label: "Pipeline Value",
        value: "Rp 2.4 M",
        helper: "Estimasi deal aktif",
      },
    ],
    rows: [
      {
        lead: "Budi Santoso",
        company: "PT Retail Maju",
        value: "Rp 240.000.000",
        stage: "Proposal",
        status: "Hot",
      },
      {
        lead: "Sinta Dewi",
        company: "CV Digital Prima",
        value: "Rp 85.000.000",
        stage: "Discovery",
        status: "Review",
      },
      {
        lead: "Raka Putra",
        company: "PT Global Karya",
        value: "Rp 180.000.000",
        stage: "Negotiation",
        status: "Active",
      },
    ],
    aiNotes: [
      "Lead enterprise punya peluang conversion tertinggi bulan ini.",
      "Follow-up cepat disarankan untuk lead dengan stage Proposal dan Negotiation.",
      "Pipeline CRM bisa dipakai untuk forecasting finance.",
    ],
  },

  leads: {
    metrics: [
      { label: "New Leads", value: "27", helper: "Minggu ini" },
      { label: "Hot Leads", value: "12", helper: "High priority" },
      { label: "Avg Score", value: "78", helper: "Lead scoring rata-rata" },
    ],
    rows: [
      {
        name: "Budi Santoso",
        source: "Website",
        score: "92",
        owner: "Sales A",
        status: "Hot",
      },
      {
        name: "Sinta Dewi",
        source: "Instagram",
        score: "76",
        owner: "Sales B",
        status: "Review",
      },
      {
        name: "Raka Putra",
        source: "Referral",
        score: "88",
        owner: "Sales A",
        status: "Active",
      },
    ],
    aiNotes: [
      "Lead dari Website punya score paling tinggi dan harus difollow-up lebih cepat.",
      "Referral lead memiliki conversion probability stabil.",
      "Lead score nanti bisa dihitung otomatis oleh AI.",
    ],
  },

  customers: {
    metrics: [
      { label: "Customers", value: "536", helper: "Customer aktif" },
      { label: "Enterprise", value: "84", helper: "Segment high value" },
      { label: "Retention", value: "91%", helper: "Simulasi retention rate" },
    ],
    rows: [
      {
        customer: "PT Retail Maju",
        segment: "Enterprise",
        revenue: "Rp 840.000.000",
        lastActivity: "Today",
        status: "Active",
      },
      {
        customer: "CV Digital Prima",
        segment: "SMB",
        revenue: "Rp 120.000.000",
        lastActivity: "2 days ago",
        status: "Active",
      },
      {
        customer: "PT Global Karya",
        segment: "Enterprise",
        revenue: "Rp 520.000.000",
        lastActivity: "7 days ago",
        status: "Review",
      },
    ],
    aiNotes: [
      "Customer enterprise perlu program retention khusus.",
      "Customer dengan last activity rendah bisa masuk campaign reactivation.",
      "Segmentasi customer akan membantu campaign lebih presisi.",
    ],
  },

  pipeline: {
    metrics: [
      { label: "Pipeline Value", value: "Rp 2.4 M", helper: "Total active deals" },
      { label: "Win Probability", value: "42%", helper: "Forecast rata-rata" },
      { label: "Negotiation", value: "18", helper: "Deal di tahap negotiation" },
    ],
    rows: [
      {
        deal: "ERP Enterprise Rollout",
        client: "PT Retail Maju",
        value: "Rp 840.000.000",
        stage: "Proposal",
        status: "Hot",
      },
      {
        deal: "AI Reporting Add-on",
        client: "PT Global Karya",
        value: "Rp 260.000.000",
        stage: "Negotiation",
        status: "Active",
      },
      {
        deal: "CRM Implementation",
        client: "CV Prima",
        value: "Rp 120.000.000",
        stage: "Discovery",
        status: "Review",
      },
    ],
    aiNotes: [
      "Deal proposal bernilai tinggi sebaiknya diberi executive follow-up.",
      "Pipeline bisa dipakai untuk forecast cashflow di modul finance.",
      "Deal stage perlu tracking activity agar tidak stuck.",
    ],
  },

  campaigns: {
    metrics: [
      { label: "Active Campaigns", value: "8", helper: "Campaign berjalan" },
      { label: "Leads Generated", value: "327", helper: "Bulan ini" },
      { label: "Cost per Lead", value: "Rp 42k", helper: "Rata-rata CPL" },
    ],
    rows: [
      {
        campaign: "ERP Awareness Q3",
        channel: "LinkedIn",
        budget: "Rp 18.000.000",
        leads: "84",
        status: "Active",
      },
      {
        campaign: "AI Agent Launch",
        channel: "Instagram",
        budget: "Rp 12.000.000",
        leads: "146",
        status: "Active",
      },
      {
        campaign: "Enterprise Webinar",
        channel: "Email",
        budget: "Rp 8.000.000",
        leads: "97",
        status: "Scheduled",
      },
    ],
    aiNotes: [
      "Instagram menghasilkan lead terbanyak namun perlu dicek kualitas score-nya.",
      "LinkedIn cocok untuk enterprise campaign bernilai tinggi.",
      "Campaign performance harus dikaitkan dengan conversion pipeline.",
    ],
  },
};