import {
  Activity,
  BadgeDollarSign,
  ContactRound,
  Megaphone,
  UserRoundPlus,
} from "lucide-react";

import type {
  ModuleConfig,
  ModuleField,
} from "@/types/modules";

import type { CRMModuleKey } from "./types";

const companyBranchFields: ModuleField[] = [
  {
    key: "company_id",
    label: "Company",
    type: "select",
    required: true,
  },
  {
    key: "branch_id",
    label: "Branch",
    type: "select",
  },
];

const leadFormFields: ModuleField[] = [
  ...companyBranchFields,
  {
    key: "owner_user_id",
    label: "Owner User",
    type: "select",
  },
  {
    key: "name",
    label: "Lead Name",
    placeholder: "Nama lead",
    required: true,
  },
  {
    key: "company_name",
    label: "Company Name",
  },
  {
    key: "email",
    label: "Email",
    type: "email",
  },
  {
    key: "phone",
    label: "Phone",
  },
  {
    key: "source",
    label: "Source",
    type: "select",
    options: [
      {
        label: "Website",
        value: "website",
      },
      {
        label: "Referral",
        value: "referral",
      },
      {
        label: "Instagram",
        value: "instagram",
      },
      {
        label: "WhatsApp",
        value: "whatsapp",
      },
      {
        label: "Other",
        value: "other",
      },
    ],
  },
  {
    key: "estimated_value",
    label: "Estimated Value",
    type: "number",
    placeholder: "Contoh: 15000000",
  },
  {
    key: "status",
    label: "Status",
    type: "select",
    options: [
      {
        label: "New",
        value: "new",
      },
      {
        label: "Contacted",
        value: "contacted",
      },
      {
        label: "Qualified",
        value: "qualified",
      },
      {
        label: "Unqualified",
        value: "unqualified",
      },
      {
        label: "Converted",
        value: "converted",
      },
    ],
  },
  {
    key: "notes",
    label: "Notes",
    type: "textarea",
  },
];

const contactFormFields: ModuleField[] = [
  ...companyBranchFields,
  {
    key: "lead_id",
    label: "Lead",
    type: "select",
  },
  {
    key: "owner_user_id",
    label: "Owner User",
    type: "select",
  },
  {
    key: "name",
    label: "Contact Name",
    required: true,
  },
  {
    key: "company_name",
    label: "Company Name",
  },
  {
    key: "position",
    label: "Position",
  },
  {
    key: "email",
    label: "Email",
    type: "email",
  },
  {
    key: "phone",
    label: "Phone",
  },
];

const dealFormFields: ModuleField[] = [
  ...companyBranchFields,
  {
    key: "lead_id",
    label: "Lead",
    type: "select",
    required: true,
  },
  {
    key: "contact_id",
    label: "Contact",
    type: "select",
  },
  {
    key: "owner_user_id",
    label: "Owner User",
    type: "select",
  },
  {
    key: "title",
    label: "Deal Title",
    placeholder: "Nama deal",
    required: true,
  },
  {
    /*
     * Form menggunakan raw value,
     * bukan expected_value_display.
     */
    key: "expected_value",
    label: "Expected Value",
    type: "number",
    required: true,
    placeholder: "Contoh: 50000000",
  },
  {
    /*
     * Form menggunakan angka persen mentah.
     */
    key: "probability_percent",
    label: "Probability %",
    type: "number",
    placeholder: "Contoh: 75",
  },
  {
    key: "expected_close_date",
    label: "Expected Close Date",
    type: "date",
  },
  {
    key: "stage",
    label: "Stage",
    type: "select",
    options: [
      {
        label: "Prospecting",
        value: "prospecting",
      },
      {
        label: "Qualification",
        value: "qualification",
      },
      {
        label: "Proposal",
        value: "proposal",
      },
      {
        label: "Negotiation",
        value: "negotiation",
      },
      {
        label: "Won",
        value: "won",
      },
      {
        label: "Lost",
        value: "lost",
      },
    ],
  },
];

const activityFormFields: ModuleField[] = [
  ...companyBranchFields,
  {
    key: "lead_id",
    label: "Lead",
    type: "select",
  },
  {
    key: "contact_id",
    label: "Contact",
    type: "select",
  },
  {
    key: "deal_id",
    label: "Deal",
    type: "select",
  },
  {
    key: "activity_type",
    label: "Activity Type",
    type: "select",
    options: [
      {
        label: "Call",
        value: "call",
      },
      {
        label: "Meeting",
        value: "meeting",
      },
      {
        label: "Email",
        value: "email",
      },
      {
        label: "WhatsApp",
        value: "whatsapp",
      },
      {
        label: "Task",
        value: "task",
      },
      {
        label: "Note",
        value: "note",
      },
    ],
  },
  {
    key: "subject",
    label: "Subject",
  },
  {
    key: "due_at",
    label: "Due Date",
    type: "datetime-local",
  },
  {
    key: "status",
    label: "Status",
    type: "select",
    options: [
      {
        label: "Planned",
        value: "planned",
      },
      {
        label: "Done",
        value: "done",
      },
      {
        label: "Cancelled",
        value: "cancelled",
      },
    ],
  },
  {
    key: "notes",
    label: "Notes",
    type: "textarea",
  },
];

const campaignFormFields: ModuleField[] = [
  ...companyBranchFields,
  {
    key: "name",
    label: "Campaign Name",
    required: true,
  },
  {
    key: "channel",
    label: "Channel",
    type: "select",
    options: [
      {
        label: "Instagram",
        value: "instagram",
      },
      {
        label: "WhatsApp",
        value: "whatsapp",
      },
      {
        label: "Email",
        value: "email",
      },
      {
        label: "Website",
        value: "website",
      },
      {
        label: "Referral",
        value: "referral",
      },
      {
        label: "Other",
        value: "other",
      },
    ],
  },
  {
    key: "budget_amount",
    label: "Budget Amount",
    type: "number",
  },
  {
    key: "leads_count",
    label: "Leads Count",
    type: "number",
  },
  {
    key: "start_date",
    label: "Start Date",
    type: "date",
  },
  {
    key: "end_date",
    label: "End Date",
    type: "date",
  },
  {
    key: "status",
    label: "Status",
    type: "select",
    options: [
      {
        label: "Draft",
        value: "draft",
      },
      {
        label: "Active",
        value: "active",
      },
      {
        label: "Paused",
        value: "paused",
      },
      {
        label: "Completed",
        value: "completed",
      },
      {
        label: "Cancelled",
        value: "cancelled",
      },
    ],
  },
  {
    key: "notes",
    label: "Notes",
    type: "textarea",
  },
];

export const crmModuleConfig: Record<
  CRMModuleKey,
  ModuleConfig
> = {
  leads: {
    badge: "CRM / Leads",
    title: "Leads",
    description:
      "Kelola calon customer, source, estimated value, status, dan follow up.",
    icon: UserRoundPlus,
    tableTitle: "Lead Records",
    tableDescription:
      "Daftar lead berdasarkan company dan status.",
    columns: [
      {
        key: "name",
        label: "Lead",
      },
      {
        key: "company_name",
        label: "Company",
      },
      {
        key: "email",
        label: "Email",
      },
      {
        key: "phone",
        label: "Phone",
      },
      {
        key: "source_label",
        label: "Source",
      },
      {
        key: "estimated_value_display",
        label: "Estimated Value",
      },
      {
        key: "status_label",
        label: "Status",
      },
    ],
    formFields: leadFormFields,
  },

  contacts: {
    badge: "CRM / Contacts",
    title: "Contacts",
    description:
      "Kelola contact dan PIC customer.",
    icon: ContactRound,
    tableTitle: "Contact Records",
    tableDescription:
      "Daftar contact atau PIC customer.",
    columns: [
      {
        key: "name",
        label: "Contact",
      },
      {
        key: "company_name",
        label: "Company",
      },
      {
        key: "position",
        label: "Position",
      },
      {
        key: "email",
        label: "Email",
      },
      {
        key: "phone",
        label: "Phone",
      },
      {
        key: "lead_name",
        label: "Lead",
      },
    ],
    formFields: contactFormFields,
  },

  deals: {
    badge: "CRM / Pipeline",
    title: "Sales Pipeline",
    description:
      "Kelola deal, expected value, probability, stage, dan target closing.",
    icon: BadgeDollarSign,
    tableTitle: "Pipeline Deals",
    tableDescription:
      "Data deal berdasarkan stage, expected value, dan probability.",
    columns: [
  {
    key: "title",
    label: "Deal",
  },
  {
    key: "lead_name",
    label: "Lead",
  },
  {
    key: "contact_name",
    label: "Contact",
  },
  {
    key: "expected_value_display",
    label: "Expected Value",
  },
  {
    key: "probability_display",
    label: "Probability",
  },
  {
    key: "expected_close_date_display",
    label: "Close Date",
  },
  {
    key: "stage_label",
    label: "Stage",
  },
],
    formFields: dealFormFields,
  },

  activities: {
    badge: "CRM / Activities",
    title: "Activities",
    description:
      "Kelola aktivitas follow up CRM.",
    icon: Activity,
    tableTitle: "Activity Records",
    tableDescription:
      "Riwayat aktivitas berdasarkan lead, contact, dan deal.",
    columns: [
      {
        key: "activity_type_label",
        label: "Type",
      },
      {
        key: "subject",
        label: "Subject",
      },
      {
        key: "lead_name",
        label: "Lead",
      },
      {
        key: "contact_name",
        label: "Contact",
      },
      {
        key: "deal_title",
        label: "Deal",
      },
      {
        key: "activity_date_display",
        label: "Date",
      },
      {
        key: "status_label",
        label: "Status",
      },
    ],
    formFields: activityFormFields,
  },

  campaigns: {
    badge: "CRM / Campaigns",
    title: "Campaigns",
    description:
      "Kelola campaign marketing dan hasil leads.",
    icon: Megaphone,
    tableTitle: "Campaign Records",
    tableDescription:
      "Data campaign berdasarkan channel, budget, dan periode.",
    columns: [
      {
        key: "name",
        label: "Campaign",
      },
      {
        key: "channel_label",
        label: "Channel",
      },
      {
        key: "budget_amount_display",
        label: "Budget",
      },
      {
        key: "leads_count",
        label: "Leads Count",
      },
      {
        key: "start_date_display",
        label: "Start Date",
      },
      {
        key: "end_date_display",
        label: "End Date",
      },
      {
        key: "status_label",
        label: "Status",
      },
    ],
    formFields: campaignFormFields,
  },
};