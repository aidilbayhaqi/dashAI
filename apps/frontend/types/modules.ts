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

export type ModuleRow = Record<string, string>;

export type ModuleConfig = {
  badge: string;
  title: string;
  description: string;
  icon: LucideIcon;
  columns: ModuleColumn[];
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