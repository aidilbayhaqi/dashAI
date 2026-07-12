import type { ReactNode } from "react";

export function CompanyFormSectionHeader({
  title,
  description,
  icon,
}: {
  title: string;
  description: string;
  icon: ReactNode;
}) {
  return (
    <div className="mb-6 flex min-w-0 items-start gap-3">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300">
        {icon}
      </div>
      <div className="min-w-0">
        <h2 className="text-lg font-black text-slate-950 dark:text-white">{title}</h2>
        <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">{description}</p>
      </div>
    </div>
  );
}

export function CompanyFormInput({
  label,
  value,
  onChange,
  type = "text",
  required = false,
  placeholder,
  min,
  max,
}: {
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
  placeholder?: string;
  min?: number;
  max?: number;
}) {
  return (
    <label className="block min-w-0 space-y-2">
      <span className="block text-[11px] font-black uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {label}{required ? <span className="ml-1 text-rose-500">*</span> : null}
      </span>
      <input
        type={type}
        value={value}
        required={required}
        placeholder={placeholder}
        min={min}
        max={max}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-800 dark:bg-[#02040a] dark:text-white"
      />
    </label>
  );
}

export function CompanyFormSelect({
  label,
  value,
  onChange,
  children,
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
  required?: boolean;
}) {
  return (
    <label className="block min-w-0 space-y-2">
      <span className="block text-[11px] font-black uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {label}{required ? <span className="ml-1 text-rose-500">*</span> : null}
      </span>
      <select
        value={value}
        required={required}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-950 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-800 dark:bg-[#02040a] dark:text-white"
      >
        {children}
      </select>
    </label>
  );
}
