import type { ComponentType } from "react";

export type ModuleRow = Record<string, any>;

export type ModuleFieldType =
  | "text"
  | "email"
  | "password"
  | "number"
  | "date"
  | "datetime-local"
  | "time"
  | "select"
  | "textarea"
  | "file"
  | "hidden";

export type ModuleFieldOption = {
  label: string;
  value: string;
};

export type ModuleField = {
  key: string;
  label: string;
  type?: ModuleFieldType;
  required?: boolean;
  placeholder?: string;
  options?: ModuleFieldOption[];
  disabled?: boolean;
  readOnly?: boolean;
  hidden?: boolean;
  accept?: string;
  helper?: string;
};

export type ModuleColumn = {
  key: string;
  label: string;
  hidden?: boolean;
  className?: string;
};

export type ModuleMetric = {
  label: string;
  value: string;
  helper?: string;
  trend?: string;
};

export type ModuleData = {
  rows: ModuleRow[];
  metrics?: ModuleMetric[];
  aiNotes?: string[];
};

export type ModuleIcon = ComponentType<{
  size?: number;
  className?: string;
  strokeWidth?: number;
}>;

export type ModuleAction = {
  label: string;
  icon?: ModuleIcon;
  onClick?: () => void | Promise<void>;
  href?: string;
  disabled?: boolean;
  variant?: "primary" | "secondary" | "danger";
};

export type ModuleConfig = {
  badge: string;
  title: string;
  description?: string;
  icon?: ModuleIcon;
  tableTitle?: string;
  tableDescription?: string;
  columns: ModuleColumn[];
  formFields: ModuleField[];
  detailFields?: ModuleField[];
  createButtonLabel?: string;
  emptyTitle?: string;
  emptyDescription?: string;
};
