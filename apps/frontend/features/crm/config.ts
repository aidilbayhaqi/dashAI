import {
  Activity,
  BadgeDollarSign,
  Megaphone,
  ContactRound,
  UserRoundPlus,
} from "lucide-react";

import type { ModuleConfig, ModuleField } from "@/types/modules";
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
    label: "Owner User ID",
    placeholder: "Optional, boleh dikosongkan",
  },
  {
    key: "name",
    label: "Lead Name",
    placeholder: "Nama lead / calon customer",
    required: true,
  },
  {
    key: "company_name",
    label: "Company Name",
    placeholder: "PT Contoh Customer",
  },
  {
    key: "email",
    label: "Email",
    type: "email",
  },
  {
    key: "phone",
    label: "Phone",
    placeholder: "+62-812-xxxx",
  },
  {
    key: "source",
    label: "Source",
    type: "select",
    options: [
      { label: "Website", value: "website" },
      { label: "Referral", value: "referral" },
      { label: "Instagram", value: "instagram" },
      { label: "WhatsApp", value: "whatsapp" },
      { label: "Postman", value: "postman" },
      { label: "Other", value: "other" },
    ],
  },
  {
    key: "estimated_value",
    label: "Estimated Value",
    type: "number",
  },
  {
    key: "status",
    label: "Status",
    type: "select",
    options: [
      { label: "New", value: "new" },
      { label: "Contacted", value: "contacted" },
      { label: "Qualified", value: "qualified" },
      { label: "Lost", value: "lost" },
      { label: "Converted", value: "converted" },
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
    label: "Owner User ID",
    placeholder: "Optional, boleh dikosongkan",
  },
  {
    key: "name",
    label: "Contact Name",
    placeholder: "Nama contact",
    required: true,
  },
  {
    key: "company_name",
    label: "Company Name",
    placeholder: "PT Customer",
  },
  {
    key: "position",
    label: "Position",
    placeholder: "Owner / Manager / PIC",
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
    label: "Owner User ID",
    placeholder: "Optional, boleh dikosongkan",
  },
  {
    key: "title",
    label: "Deal Title",
    placeholder: "Deal / opportunity name",
    required: true,
  },
  {
    key: "expected_value",
    label: "Expected Value",
    type: "number",
    required: true,
  },
  {
    key: "probability_percent",
    label: "Probability %",
    type: "number",
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
      { label: "Prospecting", value: "prospecting" },
      { label: "Qualification", value: "qualification" },
      { label: "Proposal", value: "proposal" },
      { label: "Negotiation", value: "negotiation" },
      { label: "Won", value: "won" },
      { label: "Lost", value: "lost" },
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
      { label: "Call", value: "call" },
      { label: "Meeting", value: "meeting" },
      { label: "Email", value: "email" },
      { label: "WhatsApp", value: "whatsapp" },
      { label: "Follow Up", value: "follow_up" },
      { label: "Note", value: "note" },
    ],
  },
  {
    key: "subject",
    label: "Subject",
    placeholder: "Follow up customer",
  },
  {
    key: "activity_date",
    label: "Activity Date",
    type: "datetime-local",
  },
  {
    key: "status",
    label: "Status",
    type: "select",
    options: [
      { label: "Planned", value: "planned" },
      { label: "Done", value: "done" },
      { label: "Cancelled", value: "cancelled" },
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
    placeholder: "Campaign Ramadhan / Launching Product",
    required: true,
  },
  {
    key: "channel",
    label: "Channel",
    type: "select",
    options: [
      { label: "Instagram", value: "instagram" },
      { label: "WhatsApp", value: "whatsapp" },
      { label: "Email", value: "email" },
      { label: "Website", value: "website" },
      { label: "Referral", value: "referral" },
      { label: "Other", value: "other" },
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
      { label: "Draft", value: "draft" },
      { label: "Running", value: "running" },
      { label: "Paused", value: "paused" },
      { label: "Completed", value: "completed" },
      { label: "Cancelled", value: "cancelled" },
    ],
  },
  {
    key: "notes",
    label: "Notes",
    type: "textarea",
  },
];

export const crmModuleConfig: Record<CRMModuleKey, ModuleConfig> = {
  leads: {
    badge: "CRM / Leads",
    title: "Leads",
    description:
      "Kelola calon customer, sumber lead, estimasi nilai, status pipeline, dan catatan follow up.",
    icon: UserRoundPlus,
    tableTitle: "Lead Records",
    tableDescription: "Data leads berdasarkan company, branch, source, dan status.",
    columns: [
      { key: "name", label: "Lead" },
      { key: "company_name", label: "Company" },
      { key: "email", label: "Email" },
      { key: "phone", label: "Phone" },
      { key: "source", label: "Source" },
      { key: "estimated_value", label: "Estimated Value" },
      { key: "status", label: "Status" },
    ],
    formFields: leadFormFields,
  },

  contacts: {
    badge: "CRM / Contacts",
    title: "Contacts",
    description:
      "Kelola contact customer, posisi PIC, email, nomor telepon, dan relasi ke lead.",
    icon: ContactRound,
    tableTitle: "Contact Records",
    tableDescription: "Daftar contact/PIC customer dari CRM.",
    columns: [
      { key: "name", label: "Contact" },
      { key: "company_name", label: "Company" },
      { key: "position", label: "Position" },
      { key: "email", label: "Email" },
      { key: "phone", label: "Phone" },
      { key: "lead_name", label: "Lead" },
    ],
    formFields: contactFormFields,
  },

  deals: {
    badge: "CRM / Deals",
    title: "Deals",
    description:
      "Kelola opportunity, nilai deal, probabilitas closing, stage, dan target close date.",
    icon: BadgeDollarSign,
    tableTitle: "Deal Records",
    tableDescription: "Pipeline deal berdasarkan lead, contact, stage, dan expected value.",
    columns: [
      { key: "title", label: "Deal" },
      { key: "lead_name", label: "Lead" },
      { key: "contact_name", label: "Contact" },
      { key: "expected_value", label: "Expected Value" },
      { key: "probability_percent", label: "Probability" },
      { key: "expected_close_date", label: "Close Date" },
      { key: "stage", label: "Stage" },
    ],
    formFields: dealFormFields,
  },

  activities: {
    badge: "CRM / Activities",
    title: "Activities",
    description:
      "Monitoring aktivitas follow up seperti call, meeting, email, WhatsApp, dan catatan CRM.",
    icon: Activity,
    tableTitle: "Activity Records",
    tableDescription: "Riwayat aktivitas CRM berdasarkan lead, contact, deal, dan status.",
    columns: [
      { key: "activity_type", label: "Type" },
      { key: "subject", label: "Subject" },
      { key: "lead_name", label: "Lead" },
      { key: "contact_name", label: "Contact" },
      { key: "deal_title", label: "Deal" },
      { key: "activity_date", label: "Date" },
      { key: "status", label: "Status" },
    ],
    formFields: activityFormFields,
  },

  campaigns: {
    badge: "CRM / Campaigns",
    title: "Campaigns",
    description:
      "Kelola campaign marketing, channel, budget, jumlah leads, periode, dan status campaign.",
    icon: Megaphone,
    tableTitle: "Campaign Records",
    tableDescription: "Daftar campaign CRM berdasarkan company, channel, budget, dan status.",
    columns: [
      { key: "name", label: "Campaign" },
      { key: "channel", label: "Channel" },
      { key: "budget_amount_display", label: "Budget" },
      { key: "leads_count", label: "Leads" },
      { key: "start_date", label: "Start Date" },
      { key: "end_date", label: "End Date" },
      { key: "status", label: "Status" },
    ],
    formFields: campaignFormFields,
  },
};