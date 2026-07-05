/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useMemo, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { ImagePlus, Loader2, UploadCloud, X } from "lucide-react";

import { api } from "@/lib/api";
import {
  getCurrentCompanyId,
  isCurrentUserSuperAdmin,
} from "@/lib/auth-scope";
import { getSelectedCompanyId } from "@/lib/company-scope";
import type {
  ModuleColumn,
  ModuleField,
  ModuleFieldOption,
  ModuleRow,
} from "@/types/modules";

type RecordModalProps = {
  open: boolean;
  title: string;
  mode?: "create" | "edit";
  moduleKey?: string;
  columns: ModuleColumn[];
  fields?: ModuleField[];
  initialRow?: ModuleRow | null;
  isSubmitting?: boolean;
  onClose: () => void;
  onSubmit: (row: ModuleRow) => Promise<void> | void;
};

type InputField = ModuleColumn | ModuleField;
type RawRow = Record<string, unknown>;

function isModuleField(field: InputField): field is ModuleField {
  return (
    "type" in field ||
    "placeholder" in field ||
    "required" in field ||
    "options" in field
  );
}

function getFieldType(field: InputField): ModuleField["type"] {
  return isModuleField(field) ? field.type ?? "text" : "text";
}

function getFieldRequired(field: InputField): boolean {
  return isModuleField(field) ? field.required ?? false : false;
}

function getFieldPlaceholder(field: InputField): string {
  if (isModuleField(field) && field.placeholder) {
    return field.placeholder;
  }

  return `Input ${field.label}`;
}

function getStaticOptions(field: InputField): ModuleFieldOption[] {
  return isModuleField(field) ? field.options ?? [] : [];
}

function getInputType(fieldType: ModuleField["type"]) {
  if (
    fieldType === "number" ||
    fieldType === "date" ||
    fieldType === "datetime-local" ||
    fieldType === "email" ||
    fieldType === "password"
  ) {
    return fieldType;
  }

  return "text";
}

function isPreviewableImage(value: string) {
  return (
    value.startsWith("http://") ||
    value.startsWith("https://") ||
    value.startsWith("/")
  );
}

function isValidUuid(value: string | undefined | null) {
  if (!value) return false;

  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

function hasField(inputFields: InputField[], key: string) {
  return inputFields.some((field) => field.key === key);
}

function isSelectField(field: InputField) {
  const fieldType = getFieldType(field);

  return (
    fieldType === "select" ||
    field.key === "company_id" ||
    field.key === "branch_id" ||
    field.key === "cash_account_id" ||
    field.key === "account_id" ||
    field.key === "accounts_id"
  );
}

function isFileField(field: InputField) {
  return getFieldType(field) === "file";
}

function isTextareaField(field: InputField) {
  return getFieldType(field) === "textarea";
}

function isFinanceTransaction({
  title,
  moduleKey,
}: {
  title: string;
  moduleKey?: string;
}) {
  const normalized = `${title} ${moduleKey ?? ""}`.toLowerCase();

  return (
    normalized.includes("finance") ||
    normalized.includes("transaction") ||
    moduleKey === "overview" ||
    moduleKey === "transactions"
  );
}

function normalizeRows(data: unknown): RawRow[] {
  if (Array.isArray(data)) return data as RawRow[];

  if (!data || typeof data !== "object") return [];

  const record = data as Record<string, unknown>;

  if (Array.isArray(record.items)) return record.items as RawRow[];
  if (Array.isArray(record.data)) return record.data as RawRow[];
  if (Array.isArray(record.results)) return record.results as RawRow[];
  if (Array.isArray(record.rows)) return record.rows as RawRow[];
  if (Array.isArray(record.branches)) return record.branches as RawRow[];
  if (Array.isArray(record.cash_accounts)) return record.cash_accounts as RawRow[];

  return [];
}

function pickString(row: RawRow, keys: string[]) {
  for (const key of keys) {
    const value = row[key];

    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return String(value);
    }
  }

  return "";
}

function getOptionId(row: RawRow) {
  return pickString(row, [
    "id",
    "uuid",
    "value",
    "branch_id",
    "company_branch_id",
    "cash_account_id",
    "account_id",
  ]);
}

function getOptionLabel(row: RawRow) {
  return (
    pickString(row, [
      "name",
      "company_name",
      "branch_name",
      "company_branch_name",
      "outlet_name",
      "store_name",
      "warehouse_name",
      "location_name",
      "account_name",
      "cash_account_name",
      "bank_name",
      "title",
      "code",
      "email",
      "id",
      "uuid",
    ]) || "-"
  );
}

function rowsToOptions(rows: RawRow[]): ModuleFieldOption[] {
  return rows
    .map((row) => {
      const id = getOptionId(row);

      if (!id) return null;

      return {
        value: id,
        label: getOptionLabel(row),
      };
    })
    .filter((item): item is ModuleFieldOption => Boolean(item));
}

function rowsToCashAccountOptions(rows: RawRow[]): ModuleFieldOption[] {
  return rows
    .map((row) => {
      const id = getOptionId(row);

      if (!id) return null;

      const name =
        pickString(row, [
          "name",
          "account_name",
          "cash_account_name",
          "bank_name",
          "account_holder_name",
          "code",
        ]) || id;

      const accountNumber = pickString(row, [
        "account_number",
        "account_no",
        "number",
        "code",
      ]);

      const label =
        name && accountNumber && name !== accountNumber
          ? `${name} - ${accountNumber}`
          : name;

      return {
        value: id,
        label,
      };
    })
    .filter((item): item is ModuleFieldOption => Boolean(item));
}

async function fetchApiRows(
  endpoint: string,
  params?: Record<string, unknown>,
  options?: {
    silent?: boolean;
  }
): Promise<RawRow[]> {
  try {
    const response = await api.get(endpoint, {
      params,
    });

    return normalizeRows(response.data);
  } catch (error) {
    if (!options?.silent) {
      console.warn(`Failed to fetch ${endpoint}:`, error);
    }

    return [];
  }
}

async function fetchCompanies() {
  return fetchApiRows("/api/v1/companies", undefined, {
    silent: true,
  });
}

async function fetchBranchesByCompany(companyId: string) {
  if (!companyId || !isValidUuid(companyId)) return [];

  const candidates: Array<{
    endpoint: string;
    params?: Record<string, unknown>;
  }> = [
    {
      endpoint: `/api/v1/companies/${companyId}/branches`,
    },
    {
      endpoint: "/api/v1/branches",
      params: {
        company_id: companyId,
      },
    },
    {
      endpoint: "/api/v1/company/branches",
      params: {
        company_id: companyId,
      },
    },
    {
      endpoint: "/api/v1/admin/branches",
      params: {
        company_id: companyId,
      },
    },
  ];

  for (const candidate of candidates) {
    const rows = await fetchApiRows(candidate.endpoint, candidate.params, {
      silent: true,
    });

    if (rows.length > 0) {
      return rows;
    }
  }

  return [];
}

async function fetchCashAccountsByCompany(companyId: string) {
  if (!companyId || !isValidUuid(companyId)) return [];

  const candidates: Array<{
    endpoint: string;
    params?: Record<string, unknown>;
  }> = [
    {
      endpoint: "/api/v1/finance/cash-accounts",
      params: {
        company_id: companyId,
        limit: 100,
        sort_by: "created_at",
        sort_order: "asc",
      },
    },
    {
      endpoint: "/api/v1/finance/cash_accounts",
      params: {
        company_id: companyId,
      },
    },
    {
      endpoint: "/api/v1/finance/accounts/cash",
      params: {
        company_id: companyId,
      },
    },
    {
      endpoint: "/api/v1/finance/accounts",
      params: {
        company_id: companyId,
      },
    },
    {
      endpoint: "/api/v1/accounts",
      params: {
        company_id: companyId,
      },
    },
  ];

  for (const candidate of candidates) {
    const rows = await fetchApiRows(candidate.endpoint, candidate.params, {
      silent: true,
    });

    if (rows.length > 0) {
      return rows;
    }
  }

  return [];
}

function getBackendBaseUrl() {
  const rawBaseUrl =
    process.env.NEXT_PUBLIC_API_URL ||
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    "http://localhost:8000";

  return rawBaseUrl.replace(/\/$/, "");
}

function getBackendOriginUrl() {
  const baseUrl = getBackendBaseUrl();

  if (baseUrl.endsWith("/api/v1")) {
    return baseUrl.replace(/\/api\/v1$/, "");
  }

  return baseUrl;
}

function getUploadUrl() {
  const baseUrl = getBackendBaseUrl();

  if (baseUrl.endsWith("/api/v1")) {
    return `${baseUrl}/files/upload`;
  }

  return `${baseUrl}/api/v1/files/upload`;
}

function normalizeUploadedUrl(url: string) {
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }

  if (url.startsWith("/")) {
    return `${getBackendOriginUrl()}${url}`;
  }

  return url;
}

function getUploadContext(fieldKey: string, moduleKey?: string) {
  const normalized = `${fieldKey} ${moduleKey ?? ""}`.toLowerCase();

  if (
    normalized.includes("image_url") ||
    normalized.includes("photo") ||
    normalized.includes("product")
  ) {
    return "product-photo";
  }

  if (
    normalized.includes("employee") ||
    normalized.includes("avatar") ||
    normalized.includes("photo_url")
  ) {
    return "employee-photo";
  }

  if (
    normalized.includes("proof") ||
    normalized.includes("receipt") ||
    normalized.includes("attachment") ||
    normalized.includes("transaction")
  ) {
    return "transaction-proof";
  }

  if (normalized.includes("logo") || normalized.includes("company")) {
    return "company-logo";
  }

  return "general";
}

function extractUploadedUrl(data: unknown): string | null {
  if (!data || typeof data !== "object") return null;

  const record = data as Record<string, unknown>;

  const candidates = [
    record.url,
    record.file_url,
    record.fileUrl,
    record.public_url,
    record.publicUrl,
    record.path,
    record.file_path,
    record.filePath,
    record.attachment_url,
    record.attachmentUrl,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.length > 0) {
      return normalizeUploadedUrl(candidate);
    }
  }

  if (record.data && typeof record.data === "object") {
    return extractUploadedUrl(record.data);
  }

  if (record.file && typeof record.file === "object") {
    return extractUploadedUrl(record.file);
  }

  return null;
}

function formatUploadError(data: unknown) {
  if (!data || typeof data !== "object") {
    return "Unknown upload error.";
  }

  const record = data as Record<string, unknown>;

  if (typeof record.detail === "string") {
    return record.detail;
  }

  if (Array.isArray(record.detail)) {
    return record.detail
      .map((item) => {
        if (!item || typeof item !== "object") return String(item);

        const errorItem = item as Record<string, unknown>;
        const location = Array.isArray(errorItem.loc)
          ? errorItem.loc.join(".")
          : "unknown";
        const message =
          typeof errorItem.msg === "string" ? errorItem.msg : "Validation error";

        return `${location}: ${message}`;
      })
      .join("\n");
  }

  return JSON.stringify(data);
}

async function uploadRecordFile({
  file,
  fieldKey,
  moduleKey,
  companyId,
}: {
  file: File;
  fieldKey: string;
  moduleKey?: string;
  companyId?: string;
}) {
  const context = getUploadContext(fieldKey, moduleKey);

  const formData = new FormData();
  formData.append("context", context);
  formData.append("file", file, file.name);

  if (companyId && companyId !== "all" && isValidUuid(companyId)) {
    formData.append("company_id", companyId);
  }

  const response = await fetch(getUploadUrl(), {
    method: "POST",
    body: formData,
  });

  const responseData: unknown = await response.json().catch(() => ({}));

  if (!response.ok) {
    console.log("Upload failed:", responseData);
    throw new Error(formatUploadError(responseData));
  }

  const uploadedUrl = extractUploadedUrl(responseData);

  if (!uploadedUrl) {
    console.log("Upload response:", responseData);
    throw new Error("Upload berhasil, tapi backend tidak mengembalikan url/path.");
  }

  return uploadedUrl;
}

function getStatusDefault(field: InputField) {
  const options = getStaticOptions(field);

  if (options.some((option) => option.value === "active")) return "active";
  if (options.some((option) => option.value === "draft")) return "draft";

  return options[0]?.value ? String(options[0].value) : "";
}

function getDefaultValue(field: InputField) {
  if (field.key === "transaction_type") return "income";
  if (field.key === "cashflow_activity") return "operating";
  if (field.key === "payment_method") return "cash";

  if (field.key === "product_type") return "physical";
  if (field.key === "track_stock") return "true";
  if (field.key === "unit") return "pcs";

  if (field.key === "status") {
    return getStatusDefault(field);
  }

  return "";
}

function buildInitialValues(
  inputFields: InputField[],
  initialRow?: ModuleRow | null
): ModuleRow {
  const values: ModuleRow = {};

  inputFields.forEach((field) => {
    const existingValue = initialRow?.[field.key];

    if (existingValue !== undefined && existingValue !== null) {
      values[field.key] = String(existingValue);
      return;
    }

    values[field.key] = getDefaultValue(field);
  });

  const currentCompanyId = getCurrentCompanyId();
  const selectedCompanyId = getSelectedCompanyId();

  if (hasField(inputFields, "company_id")) {
    if (initialRow?.company_id) {
      values.company_id = String(initialRow.company_id);
    } else if (
      isCurrentUserSuperAdmin() &&
      selectedCompanyId &&
      selectedCompanyId !== "all"
    ) {
      values.company_id = selectedCompanyId;
    } else if (currentCompanyId) {
      values.company_id = currentCompanyId;
    }
  }

  if (hasField(inputFields, "total_amount") && !values.total_amount && values.amount) {
    values.total_amount = values.amount;
  }

  if (
    hasField(inputFields, "subtotal_amount") &&
    !values.subtotal_amount &&
    values.amount
  ) {
    values.subtotal_amount = values.amount;
  }

  return values;
}

export function RecordModal({
  open,
  title,
  mode = "create",
  moduleKey,
  columns,
  fields,
  initialRow,
  isSubmitting = false,
  onClose,
  onSubmit,
}: RecordModalProps) {
  const inputFields = useMemo<InputField[]>(() => {
    return fields && fields.length > 0 ? fields : columns;
  }, [fields, columns]);

  const initialValues = useMemo<ModuleRow>(() => {
    return buildInitialValues(inputFields, initialRow);
  }, [inputFields, initialRow]);

  const [values, setValues] = useState<ModuleRow>({});
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);

  const [companyOptions, setCompanyOptions] = useState<ModuleFieldOption[]>([]);
  const [branchOptions, setBranchOptions] = useState<ModuleFieldOption[]>([]);
  const [cashAccountOptions, setCashAccountOptions] = useState<
    ModuleFieldOption[]
  >([]);

  const [isLoadingCompanies, setIsLoadingCompanies] = useState(false);
  const [isLoadingBranches, setIsLoadingBranches] = useState(false);
  const [isLoadingCashAccounts, setIsLoadingCashAccounts] = useState(false);

  const currentCompanyId = getCurrentCompanyId();
  const isSuperAdmin = isCurrentUserSuperAdmin();

  const canChooseCompany = isSuperAdmin || !currentCompanyId;

  const shouldFetchCompanies = hasField(inputFields, "company_id");
  const shouldFetchBranches = hasField(inputFields, "branch_id");
  const shouldFetchCashAccounts =
    hasField(inputFields, "cash_account_id") ||
    hasField(inputFields, "account_id") ||
    hasField(inputFields, "accounts_id");

  function getModalCompanyId() {
    if (canChooseCompany) {
      const selectedCompanyId = String(values.company_id ?? "");

      if (
        selectedCompanyId &&
        selectedCompanyId !== "all" &&
        isValidUuid(selectedCompanyId)
      ) {
        return selectedCompanyId;
      }

      return "";
    }

    if (currentCompanyId && isValidUuid(currentCompanyId)) {
      return currentCompanyId;
    }

    return "";
  }

  useEffect(() => {
    if (!open) return;

    setValues(initialValues);
    setUploadingKey(null);
    setBranchOptions([]);
    setCashAccountOptions([]);
  }, [open, initialValues]);

  useEffect(() => {
    if (!open || !shouldFetchCompanies) return;

    let ignore = false;

    async function loadCompanies() {
      try {
        setIsLoadingCompanies(true);

        const rows = await fetchCompanies();

        if (ignore) return;

        const options = rowsToOptions(rows);

        if (!canChooseCompany && currentCompanyId) {
  const existing = options.find(
    (option) => option.value === currentCompanyId
  );

  const fixedCompanyOption = existing ?? {
    label: "Company sedang login",
    value: currentCompanyId,
  };

  setCompanyOptions([fixedCompanyOption]);

  setValues((current) => ({
    ...current,
    company_id: currentCompanyId,
  }));

  return;
}

        setCompanyOptions(options);
      } finally {
        if (!ignore) {
          setIsLoadingCompanies(false);
        }
      }
    }

    void loadCompanies();

    return () => {
      ignore = true;
    };
  }, [open, shouldFetchCompanies, canChooseCompany, currentCompanyId]);

  useEffect(() => {
    if (!open || !shouldFetchBranches) return;

    const companyId = getModalCompanyId();

    if (!companyId) {
      setBranchOptions([]);
      setIsLoadingBranches(false);
      return;
    }

    let ignore = false;

    async function loadBranches() {
      try {
        setIsLoadingBranches(true);

        const rows = await fetchBranchesByCompany(companyId);
        const options = rowsToOptions(rows);

        if (ignore) return;

        setBranchOptions(options);

        if (!values.branch_id && options.length === 1) {
          setValues((current) => ({
            ...current,
            branch_id: String(options[0].value),
          }));
        }
      } finally {
        if (!ignore) {
          setIsLoadingBranches(false);
        }
      }
    }

    void loadBranches();

    return () => {
      ignore = true;
    };
  }, [
    open,
    shouldFetchBranches,
    values.company_id,
    canChooseCompany,
    currentCompanyId,
  ]);

  useEffect(() => {
    if (!open || !shouldFetchCashAccounts) return;

    const companyId = getModalCompanyId();

    if (!companyId) {
      setCashAccountOptions([]);
      setIsLoadingCashAccounts(false);
      return;
    }

    let ignore = false;

    async function loadCashAccounts() {
      try {
        setIsLoadingCashAccounts(true);

        const rows = await fetchCashAccountsByCompany(companyId);
        const options = rowsToCashAccountOptions(rows);

        if (ignore) return;

        setCashAccountOptions(options);

        const selectedCashAccount =
          values.cash_account_id || values.account_id || values.accounts_id;

        if (!selectedCashAccount && options.length === 1) {
          setValues((current) => ({
            ...current,
            cash_account_id: String(options[0].value),
          }));
        }
      } finally {
        if (!ignore) {
          setIsLoadingCashAccounts(false);
        }
      }
    }

    void loadCashAccounts();

    return () => {
      ignore = true;
    };
  }, [
    open,
    shouldFetchCashAccounts,
    values.company_id,
    canChooseCompany,
    currentCompanyId,
  ]);

  function updateValue(key: string, value: string) {
    setValues((current) => {
      const next: ModuleRow = {
        ...current,
        [key]: value,
      };

     if (key === "company_id") {
    setBranchOptions([]);
    setCashAccountOptions([]);

    next.branch_id = "";
    next.cash_account_id = "";
    next.account_id = "";
    next.accounts_id = "";
  }

      if (
        key === "amount" &&
        hasField(inputFields, "total_amount") &&
        (!current.total_amount || current.total_amount === current.amount)
      ) {
        next.total_amount = value;
      }

      if (
        key === "amount" &&
        hasField(inputFields, "subtotal_amount") &&
        (!current.subtotal_amount || current.subtotal_amount === current.amount)
      ) {
        next.subtotal_amount = value;
      }

      return next;
    });
  }

  function getFieldOptions(field: InputField): ModuleFieldOption[] {
    if (field.key === "company_id") {
      return companyOptions;
    }

    if (field.key === "branch_id") {
      return branchOptions;
    }

    if (
      field.key === "cash_account_id" ||
      field.key === "account_id" ||
      field.key === "accounts_id"
    ) {
      return cashAccountOptions;
    }

    return getStaticOptions(field);
  }

  function getSelectPlaceholder(field: InputField) {
    if (field.key === "company_id") {
      if (isLoadingCompanies) return "Loading companies...";
      if (!canChooseCompany && currentCompanyId) return "Company akun ini";
      if (companyOptions.length === 0) return "Company belum tersedia";

      return "Pilih Company";
    }

    if (field.key === "branch_id") {
      const companyId = getModalCompanyId();

      if (!companyId) return "Pilih company dulu";
      if (isLoadingBranches) return "Loading branches...";

      if (branchOptions.length === 0) {
        return "Branch belum tersedia";
      }

      return "Pilih Branch";
    }

    if (
      field.key === "cash_account_id" ||
      field.key === "account_id" ||
      field.key === "accounts_id"
    ) {
      const companyId = getModalCompanyId();

      if (!companyId) return "Pilih company dulu";
      if (isLoadingCashAccounts) return "Loading cash accounts...";

      if (cashAccountOptions.length === 0) {
        return "Cash account belum tersedia";
      }

      return "Pilih Cash Account";
    }

    return `Pilih ${field.label}`;
  }

  function getSelectDisabled(field: InputField) {
  if (isSubmitting || Boolean(uploadingKey)) return true;

  if (field.key === "company_id") {
    return isLoadingCompanies || !canChooseCompany;
  }

  /**
   * Branch:
   * - Kalau superadmin belum pilih company => disable
   * - Kalau owner/user biasa => tetap aktif karena company sudah fixed dari akun
   */
  if (field.key === "branch_id") {
    const companyId = getModalCompanyId();

    return !companyId || isLoadingBranches;
  }

  /**
   * Account Name / Cash Account:
   * - Kalau superadmin belum pilih company => disable
   * - Kalau owner/user biasa => tetap aktif karena company sudah fixed dari akun
   */
  if (
    field.key === "cash_account_id" ||
    field.key === "account_id" ||
    field.key === "accounts_id"
  ) {
    const companyId = getModalCompanyId();

    return !companyId || isLoadingCashAccounts;
  }

  return false;
}

  async function handleUpload(field: InputField, file: File | null) {
    if (!file) {
      window.alert("File belum dipilih.");
      return;
    }

    const companyId = getModalCompanyId();

    try {
      setUploadingKey(field.key);

      const uploadedUrl = await uploadRecordFile({
        file,
        fieldKey: field.key,
        moduleKey,
        companyId,
      });

      updateValue(field.key, uploadedUrl);
    } catch (error) {
      console.error("Upload error:", error);
      window.alert(
        error instanceof Error
          ? `Upload gagal:\n${error.message}`
          : "Upload gagal. Cek console/network."
      );
    } finally {
      setUploadingKey(null);
    }
  }

  function handleFileChange(
    event: ChangeEvent<HTMLInputElement>,
    field: InputField
  ) {
    const file = event.target.files?.[0] ?? null;

    void handleUpload(field, file);

    event.target.value = "";
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const row: ModuleRow = {
      ...values,
    };

    const modalCompanyId = getModalCompanyId();

    if (hasField(inputFields, "company_id") && modalCompanyId) {
      row.company_id = modalCompanyId;
    }

    if (isFinanceTransaction({ title, moduleKey })) {
      if (!row.transaction_type && row.type) {
        row.transaction_type = row.type;
        delete row.type;
      }

      if (!row.cashflow_activity) {
        row.cashflow_activity = "operating";
      }

      if (!row.status) {
        row.status = "draft";
      }

      if (row.amount && !row.total_amount) {
        row.total_amount = row.amount;
      }

      if (row.amount && !row.subtotal_amount) {
        row.subtotal_amount = row.amount;
      }

      if (!row.cash_account_id && row.account_id) {
        row.cash_account_id = row.account_id;
      }

      if (!row.cash_account_id && row.accounts_id) {
        row.cash_account_id = row.accounts_id;
      }

      delete row.account_id;
      delete row.accounts_id;
      delete row.account_name;
    }

    await onSubmit(row);
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-slate-950/70 px-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-[2rem] border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-900 dark:bg-[#050816]">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-700 dark:text-blue-400">
              {mode === "edit" ? "Edit Record" : "New Record"}
            </p>

            <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950 dark:text-white">
              {mode === "edit" ? "Edit" : "Tambah"} {title}
            </h2>

            <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-500">
              {moduleKey
                ? `Module: ${moduleKey}`
                : "Isi form sesuai kebutuhan data module."}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting || Boolean(uploadingKey)}
            className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 text-slate-500 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-900 dark:hover:bg-[#02040a]"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            {inputFields.map((field) => {
              const fieldType = getFieldType(field);
              const required = getFieldRequired(field);
              const placeholder = getFieldPlaceholder(field);
              const options = getFieldOptions(field);
              const currentValue = String(values[field.key] ?? "");
              const isUploading = uploadingKey === field.key;
              const selectDisabled = getSelectDisabled(field);

              return (
                <div
                  key={field.key}
                  className={
                    fieldType === "textarea" || fieldType === "file"
                      ? "md:col-span-2"
                      : ""
                  }
                >
                  <label className="mb-2 block text-xs font-black uppercase tracking-[0.12em] text-slate-500">
                    {field.label}
                    {required ? (
                      <span className="text-rose-500"> *</span>
                    ) : null}
                  </label>

                  {isTextareaField(field) ? (
                    <textarea
                      value={currentValue}
                      required={required}
                      onChange={(event) =>
                        updateValue(field.key, event.target.value)
                      }
                      placeholder={placeholder}
                      className="min-h-28 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-800 outline-none transition focus:border-blue-600 dark:border-slate-900 dark:bg-[#02040a] dark:text-white"
                    />
                  ) : isSelectField(field) ? (
                    <select
                      value={currentValue}
                      required={required}
                      disabled={selectDisabled}
                      onChange={(event) =>
                        updateValue(field.key, event.target.value)
                      }
                      className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-800 outline-none transition focus:border-blue-600 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 dark:border-slate-900 dark:bg-[#02040a] dark:text-white dark:disabled:bg-slate-900"
                    >
                      <option value="">{getSelectPlaceholder(field)}</option>

                      {options.map((option) => (
                        <option key={String(option.value)} value={String(option.value)}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  ) : isFileField(field) ? (
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-900 dark:bg-[#02040a]">
                      <div className="flex flex-col gap-4 md:flex-row md:items-center">
                        <div className="flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-900 dark:bg-[#050816]">
                          {currentValue && isPreviewableImage(currentValue) ? (
                            <img
                              src={currentValue}
                              alt={field.label}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <ImagePlus
                              size={30}
                              className="text-slate-400 dark:text-slate-600"
                            />
                          )}
                        </div>

                        <div className="flex-1">
                          <label className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-2xl bg-[#0f2a5f] px-4 text-sm font-black text-white transition hover:bg-blue-950 dark:bg-blue-700 dark:hover:bg-blue-600">
                            {isUploading ? (
                              <Loader2 size={17} className="animate-spin" />
                            ) : (
                              <UploadCloud size={17} />
                            )}

                            {isUploading ? "Uploading..." : "Upload File"}

                            <input
                              type="file"
                              accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                              className="hidden"
                              disabled={isUploading}
                              required={required && !currentValue}
                              onChange={(event) =>
                                handleFileChange(event, field)
                              }
                            />
                          </label>

                          <input
                            type="text"
                            value={currentValue}
                            onChange={(event) =>
                              updateValue(field.key, event.target.value)
                            }
                            placeholder="URL file akan muncul otomatis setelah upload"
                            className="mt-3 h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-800 outline-none transition focus:border-blue-600 dark:border-slate-900 dark:bg-[#050816] dark:text-white"
                          />

                          <p className="mt-2 text-xs leading-5 text-slate-500">
                            Setelah file berhasil di-upload, URL-nya akan masuk
                            ke field <b>{field.key}</b>.
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <input
                      type={getInputType(fieldType)}
                      value={currentValue}
                      required={required}
                      onChange={(event) =>
                        updateValue(field.key, event.target.value)
                      }
                      placeholder={placeholder}
                      className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-800 outline-none transition focus:border-blue-600 dark:border-slate-900 dark:bg-[#02040a] dark:text-white"
                    />
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-7 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting || Boolean(uploadingKey)}
              className="rounded-2xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-black text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-900 dark:bg-[#02040a] dark:text-slate-300 dark:hover:bg-[#0b1120]"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting || Boolean(uploadingKey)}
              className="rounded-2xl bg-[#0f2a5f] px-5 py-2.5 text-sm font-black text-white transition hover:bg-blue-950 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-blue-700 dark:hover:bg-blue-600"
            >
              {isSubmitting
                ? "Saving..."
                : mode === "edit"
                  ? "Update Record"
                  : "Save Record"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}