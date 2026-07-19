import { formatNumberInputValue } from "@/lib/number";

import type {
  ModuleField,
  ModuleFieldOption,
  ModuleFieldType,
  ModuleRow,
} from "@/types/modules";

import { getDefaultCompanyId } from "./lookups";
import type { InputField } from "./types";

export function isModuleField(field: InputField): field is ModuleField {
  return (
    "type" in field
    || "placeholder" in field
    || "required" in field
    || "options" in field
  );
}

export function getFieldType(field: InputField): ModuleFieldType {
  if (isModuleField(field)) return field.type ?? "text";
  return field.format === "date" ? "date" : "text";
}

export function getFieldRequired(field: InputField): boolean {
  return isModuleField(field) ? Boolean(field.required) : false;
}

export function getFieldPlaceholder(field: InputField): string {
  if (isModuleField(field) && field.placeholder) return field.placeholder;
  return `Input ${field.label}`;
}

export function getStaticOptions(field: InputField): ModuleFieldOption[] {
  return isModuleField(field) ? field.options ?? [] : [];
}

export function isSelectField(field: InputField): boolean {
  return getFieldType(field) === "select" || field.key.endsWith("_id");
}

export function isTextareaField(field: InputField): boolean {
  return getFieldType(field) === "textarea";
}

export function isFileField(field: InputField): boolean {
  return getFieldType(field) === "file";
}

export function isHiddenField(field: InputField): boolean {
  return getFieldType(field) === "hidden"
    || (isModuleField(field) && Boolean(field.hidden));
}

export function getInputType(fieldType: ModuleFieldType): string {
  if ([
    "email",
    "password",
    "number",
    "date",
    "datetime-local",
    "time",
  ].includes(fieldType)) {
    return fieldType;
  }
  return "text";
}

export function buildInitialValues(
  fields: InputField[],
  initialRow?: ModuleRow | null,
): ModuleRow {
  const result: ModuleRow = {};

  for (const field of fields) {
    const initialValue = initialRow?.[field.key];
    result[field.key] = getFieldType(field) === "number"
      ? formatNumberInputValue(initialValue)
      : initialValue === undefined || initialValue === null
        ? ""
        : String(initialValue);
  }

  const defaultCompanyId = getDefaultCompanyId();
  if (!result.company_id && defaultCompanyId) {
    result.company_id = defaultCompanyId;
  }

  return result;
}
