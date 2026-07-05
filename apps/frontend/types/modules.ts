import type { LucideIcon } from "lucide-react";

export type ModuleMetric = {
  label: string;
  value: string;
  helper: string;
  trend?: string;
};

export type ModuleColumn = {
  key: string;
  label: string;
};

export type ModuleFieldOption = {
  label: string;
  value: string;
};

export type ModuleField = {
  key: string;
  label: string;
  type?:
    | "text"
    | "number"
    | "date"
    | "datetime-local"
    | "textarea"
    | "select"
    | "email"
    | "password"
    | "file";
  placeholder?: string;
  required?: boolean;
  options?: ModuleFieldOption[];
};

export type ModuleRow = Record<string, string>;

export type ModuleConfig = {
  badge: string;
  title: string;
  description: string;
  icon: LucideIcon;
  columns: ModuleColumn[];
  formFields?: ModuleField[];
  detailFields?: ModuleField[];
  tableTitle?: string;
  tableDescription?: string;
};

export type ModuleData = {
  metrics: ModuleMetric[];
  rows: ModuleRow[];
  aiNotes: string[];
};

export type ModuleAction = {
  label: string;
  variant?: "primary" | "secondary";
};