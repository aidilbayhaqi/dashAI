import type { ReactNode } from "react";
import { Eye, EyeOff, LockKeyhole } from "lucide-react";

export function RegisterFieldLabel({
  children,
  required = false,
}: {
  children: ReactNode;
  required?: boolean;
}) {
  return (
    <label className="mb-2 block text-xs font-black uppercase tracking-[0.14em] text-slate-500">
      {children}{required ? <span className="ml-1 text-rose-400">*</span> : null}
    </label>
  );
}

export function RegisterTextInput({
  value,
  onChange,
  placeholder,
  type = "text",
  required = false,
  icon,
  autoComplete,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  required?: boolean;
  icon?: ReactNode;
  autoComplete?: string;
}) {
  return (
    <div className="flex h-12 items-center gap-3 rounded-2xl border border-white/10 bg-[#02040a] px-4 transition focus-within:border-blue-500/70 focus-within:ring-4 focus-within:ring-blue-500/10">
      {icon ? <span className="shrink-0 text-slate-600">{icon}</span> : null}
      <input
        type={type}
        value={value}
        required={required}
        autoComplete={autoComplete}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="w-full min-w-0 bg-transparent text-sm font-semibold text-white outline-none placeholder:text-slate-700"
      />
    </div>
  );
}

export function RegisterPasswordInput({
  value,
  visible,
  placeholder,
  autoComplete,
  onChange,
  onToggle,
}: {
  value: string;
  visible: boolean;
  placeholder: string;
  autoComplete: string;
  onChange: (value: string) => void;
  onToggle: () => void;
}) {
  return (
    <div className="flex h-12 items-center gap-3 rounded-2xl border border-white/10 bg-[#02040a] px-4 transition focus-within:border-blue-500/70 focus-within:ring-4 focus-within:ring-blue-500/10">
      <LockKeyhole size={18} className="shrink-0 text-slate-600" />
      <input
        type={visible ? "text" : "password"}
        value={value}
        required
        minLength={8}
        autoComplete={autoComplete}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="w-full min-w-0 bg-transparent text-sm font-semibold text-white outline-none placeholder:text-slate-700"
      />
      <button
        type="button"
        aria-label={visible ? "Sembunyikan password" : "Tampilkan password"}
        onClick={onToggle}
        className="shrink-0 text-slate-600 transition hover:text-white"
      >
        {visible ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  );
}

export function RegisterSectionHeading({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div>
      <h3 className="text-sm font-black text-white">{title}</h3>
      <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>
    </div>
  );
}
