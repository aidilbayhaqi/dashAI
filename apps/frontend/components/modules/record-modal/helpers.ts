import type { InputField } from "./types";

export function getFieldType(field: InputField) {
  return field.type ?? "text";
}

export function getFieldRequired(field: InputField) {
  return Boolean(field.required);
}

export function getFieldPlaceholder(field: InputField) {
  return field.placeholder ?? field.label;
}

export function isSelectField(field: InputField) {
  return getFieldType(field) === "select";
}

export function isTextareaField(field: InputField) {
  return getFieldType(field) === "textarea";
}

export function isFileField(field: InputField) {
  return getFieldType(field) === "file";
}

export function isHiddenField(field: InputField) {
  return getFieldType(field) === "hidden" || Boolean(field.hidden);
}

export function getInputType(fieldType: string) {
  if (fieldType === "email") return "email";
  if (fieldType === "password") return "password";
  if (fieldType === "number") return "number";
  if (fieldType === "date") return "date";
  if (fieldType === "datetime-local") return "datetime-local";
  if (fieldType === "time") return "time";

  return "text";
}