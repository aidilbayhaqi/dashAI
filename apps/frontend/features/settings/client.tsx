"use client";

/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Bell,
  Bot,
  CheckCircle2,
  Clock3,
  Globe2,
  KeyRound,
  Languages,
  Loader2,
  Save,
  Settings,
  ShieldCheck,
  UserRound,
  Wallet,
} from "lucide-react";

import {
  changePassword,
  defaultAppSettings,
  getCurrentUserSettings,
  getLocalAppSettings,
  getRemoteAppSettings,
  getSettingString,
  saveLocalAppSettings,
  saveRemoteAppSettings,
  updateCurrentUserSettings,
  type AISettingsPayload,
  type AppSettingsPayload,
  type NotificationSettingsPayload,
  type SecurityPayload,
  type UserSettingsPayload,
  type WorkspaceSettingsPayload,
} from "./api";

function getErrorMessage(error: unknown) {
  if (!error || typeof error !== "object") return "Terjadi kesalahan.";

  const record = error as {
    response?: {
      data?: {
        detail?: string;
        message?: string;
      };
    };
    message?: string;
  };

  return (
    record.response?.data?.detail ||
    record.response?.data?.message ||
    record.message ||
    "Terjadi kesalahan."
  );
}

function SectionHeader({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof Settings;
  title: string;
  description: string;
}) {
  return (
    <div className="mb-6 flex items-start gap-3">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
        <Icon size={21} />
      </div>

      <div>
        <h2 className="text-lg font-black text-slate-950 dark:text-white">
          {title}
        </h2>
        <p className="mt-1 text-sm font-semibold leading-6 text-slate-500 dark:text-slate-500">
          {description}
        </p>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  required,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-xs font-black uppercase tracking-[0.14em] text-slate-500 dark:text-slate-500">
        {label}
        {required ? <span className="text-rose-500"> *</span> : null}
      </span>

      <input
        type={type}
        value={value}
        required={required}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-600 dark:border-slate-900 dark:bg-[#02040a] dark:text-white"
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{
    label: string;
    value: string;
  }>;
}) {
  return (
    <label className="block">
      <span className="text-xs font-black uppercase tracking-[0.14em] text-slate-500 dark:text-slate-500">
        {label}
      </span>

      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-800 outline-none transition focus:border-blue-600 dark:border-slate-900 dark:bg-[#02040a] dark:text-white"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function ToggleField({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 text-left transition hover:bg-slate-50 dark:border-slate-900 dark:bg-[#02040a] dark:hover:bg-slate-950"
    >
      <div>
        <p className="text-sm font-black text-slate-900 dark:text-white">
          {label}
        </p>
        <p className="mt-1 text-xs font-semibold leading-5 text-slate-500 dark:text-slate-500">
          {description}
        </p>
      </div>

      <span
        className={[
          "relative h-7 w-12 shrink-0 rounded-full transition",
          checked ? "bg-blue-700" : "bg-slate-300 dark:bg-slate-800",
        ].join(" ")}
      >
        <span
          className={[
            "absolute top-1 h-5 w-5 rounded-full bg-white transition",
            checked ? "left-6" : "left-1",
          ].join(" ")}
        />
      </span>
    </button>
  );
}

function SummaryItem({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Settings;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-900 dark:bg-[#050816]">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-700 dark:bg-slate-900 dark:text-slate-300">
          <Icon size={18} />
        </div>

        <div>
          <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
            {label}
          </p>
          <p className="mt-1 text-sm font-black text-slate-900 dark:text-white">
            {value}
          </p>
        </div>
      </div>
    </div>
  );
}

export function SettingsClient() {
  const queryClient = useQueryClient();

  const [userForm, setUserForm] = useState<UserSettingsPayload>({
    name: "",
    full_name: "",
    email: "",
    phone: "",
  });

  const [settingsForm, setSettingsForm] =
    useState<AppSettingsPayload>(defaultAppSettings);

  const [securityForm, setSecurityForm] = useState<SecurityPayload>({
    current_password: "",
    new_password: "",
    confirm_password: "",
  });

  const [successMessage, setSuccessMessage] = useState("");

  const userQuery = useQuery({
    queryKey: ["settings", "user"],
    queryFn: getCurrentUserSettings,
  });

  const remoteSettingsQuery = useQuery({
    queryKey: ["settings", "app"],
    queryFn: async () => {
      const remote = await getRemoteAppSettings();

      return remote ?? getLocalAppSettings();
    },
  });

  useEffect(() => {
    if (!userQuery.data) return;

    setUserForm({
      name: getSettingString(userQuery.data, ["name", "username"]),
      full_name: getSettingString(userQuery.data, ["full_name", "name"]),
      email: getSettingString(userQuery.data, ["email"]),
      phone: getSettingString(userQuery.data, ["phone"]),
    });
  }, [userQuery.data]);

  useEffect(() => {
    if (!remoteSettingsQuery.data) return;

    setSettingsForm(remoteSettingsQuery.data);
  }, [remoteSettingsQuery.data]);

  const saveUserMutation = useMutation({
    mutationFn: () => updateCurrentUserSettings(userForm),
    onSuccess: () => {
      setSuccessMessage("Account settings berhasil disimpan.");
      queryClient.invalidateQueries({
        queryKey: ["settings", "user"],
      });
    },
  });

  const saveAppSettingsMutation = useMutation({
    mutationFn: async () => {
      saveLocalAppSettings(settingsForm);
      await saveRemoteAppSettings(settingsForm);

      return settingsForm;
    },
    onSuccess: () => {
      setSuccessMessage("Application settings berhasil disimpan.");
      queryClient.invalidateQueries({
        queryKey: ["settings", "app"],
      });
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: () => changePassword(securityForm),
    onSuccess: () => {
      setSuccessMessage("Password berhasil diperbarui.");
      setSecurityForm({
        current_password: "",
        new_password: "",
        confirm_password: "",
      });
    },
  });

  function updateUserField<K extends keyof UserSettingsPayload>(
    key: K,
    value: UserSettingsPayload[K]
  ) {
    setSuccessMessage("");

    setUserForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function updateWorkspaceField<K extends keyof WorkspaceSettingsPayload>(
    key: K,
    value: WorkspaceSettingsPayload[K]
  ) {
    setSuccessMessage("");

    setSettingsForm((current) => ({
      ...current,
      workspace: {
        ...current.workspace,
        [key]: value,
      },
    }));
  }

  function updateNotificationField<K extends keyof NotificationSettingsPayload>(
    key: K,
    value: NotificationSettingsPayload[K]
  ) {
    setSuccessMessage("");

    setSettingsForm((current) => ({
      ...current,
      notifications: {
        ...current.notifications,
        [key]: value,
      },
    }));
  }

  function updateAIField<K extends keyof AISettingsPayload>(
    key: K,
    value: AISettingsPayload[K]
  ) {
    setSuccessMessage("");

    setSettingsForm((current) => ({
      ...current,
      ai: {
        ...current.ai,
        [key]: value,
      },
    }));
  }

  function updateSecurityField<K extends keyof SecurityPayload>(
    key: K,
    value: SecurityPayload[K]
  ) {
    setSuccessMessage("");

    setSecurityForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  const isLoading = userQuery.isLoading || remoteSettingsQuery.isLoading;

  const summary = useMemo(() => {
    return {
      currency: settingsForm.workspace.currency,
      timezone: settingsForm.workspace.timezone,
      language: settingsForm.workspace.language === "id" ? "Indonesia" : "English",
      aiStatus: settingsForm.ai.ai_enabled ? "Enabled" : "Disabled",
    };
  }, [settingsForm]);

  if (isLoading) {
    return (
      <div className="flex min-h-[65vh] items-center justify-center">
        <div className="inline-flex items-center gap-3 rounded-3xl border border-slate-200 bg-white px-5 py-4 text-sm font-black text-slate-600 shadow-sm dark:border-slate-900 dark:bg-[#050816] dark:text-slate-300">
          <Loader2 size={18} className="animate-spin" />
          Loading settings...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm dark:border-slate-900 dark:bg-[#050816]">
        <div className="border-b border-slate-100 bg-slate-50/80 p-6 dark:border-slate-900 dark:bg-[#02040a]">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-3xl bg-[#0f2a5f] text-white shadow-lg shadow-blue-950/20">
                <Settings size={29} />
              </div>

              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-700 dark:text-blue-400">
                  System Preferences
                </p>
                <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-950 dark:text-white">
                  Settings
                </h1>
                <p className="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-500">
                  Kelola akun, workspace, notifikasi, AI assistant, dan keamanan.
                </p>
              </div>
            </div>

            {successMessage ? (
              <div className="inline-flex items-center gap-2 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-black text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300">
                <CheckCircle2 size={17} />
                {successMessage}
              </div>
            ) : null}
          </div>
        </div>

        <div className="grid gap-4 p-4 sm:p-6 md:grid-cols-2 xl:grid-cols-4">
          <SummaryItem icon={Wallet} label="Currency" value={summary.currency} />
          <SummaryItem icon={Clock3} label="Timezone" value={summary.timezone} />
          <SummaryItem icon={Languages} label="Language" value={summary.language} />
          <SummaryItem icon={Bot} label="AI Assistant" value={summary.aiStatus} />
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_420px]">
        <div className="space-y-6">
          <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-900 dark:bg-[#050816]">
            <SectionHeader
              icon={UserRound}
              title="Account Settings"
              description="Update informasi akun current user."
            />

            <form
              className="grid gap-4 md:grid-cols-2"
              onSubmit={(event) => {
                event.preventDefault();
                saveUserMutation.mutate();
              }}
            >
              <Field
                label="Username / Name"
                value={userForm.name ?? ""}
                placeholder="aidil"
                onChange={(value) => updateUserField("name", value)}
              />

              <Field
                label="Full Name"
                value={userForm.full_name ?? ""}
                placeholder="Aidil Bayhaqi"
                onChange={(value) => updateUserField("full_name", value)}
              />

              <Field
                label="Email"
                type="email"
                value={userForm.email ?? ""}
                placeholder="email@example.com"
                onChange={(value) => updateUserField("email", value)}
              />

              <Field
                label="Phone"
                value={userForm.phone ?? ""}
                placeholder="+62-812-xxxx"
                onChange={(value) => updateUserField("phone", value)}
              />

              <div className="md:col-span-2">
                <button
                  type="submit"
                  disabled={saveUserMutation.isPending}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-[#0f2a5f] px-5 text-sm font-black text-white transition hover:bg-blue-950 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-blue-700 dark:hover:bg-blue-600"
                >
                  {saveUserMutation.isPending ? (
                    <Loader2 size={17} className="animate-spin" />
                  ) : (
                    <Save size={17} />
                  )}
                  Save Account
                </button>

                {saveUserMutation.isError ? (
                  <p className="mt-3 text-sm font-bold text-rose-600">
                    {getErrorMessage(saveUserMutation.error)}
                  </p>
                ) : null}
              </div>
            </form>
          </section>

          <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-900 dark:bg-[#050816]">
            <SectionHeader
              icon={Globe2}
              title="Workspace Preferences"
              description="Atur preferensi tampilan data dan default workspace."
            />

            <form
              className="grid gap-4 md:grid-cols-2"
              onSubmit={(event) => {
                event.preventDefault();
                saveAppSettingsMutation.mutate();
              }}
            >
              <SelectField
                label="Currency"
                value={settingsForm.workspace.currency}
                onChange={(value) => updateWorkspaceField("currency", value)}
                options={[
                  { label: "IDR - Indonesian Rupiah", value: "IDR" },
                  { label: "USD - US Dollar", value: "USD" },
                ]}
              />

              <SelectField
                label="Language"
                value={settingsForm.workspace.language}
                onChange={(value) => updateWorkspaceField("language", value)}
                options={[
                  { label: "Indonesia", value: "id" },
                  { label: "English", value: "en" },
                ]}
              />

              <SelectField
                label="Timezone"
                value={settingsForm.workspace.timezone}
                onChange={(value) => updateWorkspaceField("timezone", value)}
                options={[
                  { label: "Asia/Jakarta", value: "Asia/Jakarta" },
                  { label: "Asia/Makassar", value: "Asia/Makassar" },
                  { label: "Asia/Jayapura", value: "Asia/Jayapura" },
                  { label: "UTC", value: "UTC" },
                ]}
              />

              <SelectField
                label="Date Format"
                value={settingsForm.workspace.date_format}
                onChange={(value) => updateWorkspaceField("date_format", value)}
                options={[
                  { label: "DD/MM/YYYY", value: "DD/MM/YYYY" },
                  { label: "YYYY-MM-DD", value: "YYYY-MM-DD" },
                  { label: "MM/DD/YYYY", value: "MM/DD/YYYY" },
                ]}
              />

              <SelectField
                label="Number Format"
                value={settingsForm.workspace.number_format}
                onChange={(value) => updateWorkspaceField("number_format", value)}
                options={[
                  { label: "id-ID", value: "id-ID" },
                  { label: "en-US", value: "en-US" },
                ]}
              />

              <div className="md:col-span-2">
                <button
                  type="submit"
                  disabled={saveAppSettingsMutation.isPending}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-[#0f2a5f] px-5 text-sm font-black text-white transition hover:bg-blue-950 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-blue-700 dark:hover:bg-blue-600"
                >
                  {saveAppSettingsMutation.isPending ? (
                    <Loader2 size={17} className="animate-spin" />
                  ) : (
                    <Save size={17} />
                  )}
                  Save Preferences
                </button>
              </div>
            </form>
          </section>
        </div>

        <div className="space-y-6">
          <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-900 dark:bg-[#050816]">
            <SectionHeader
              icon={Bell}
              title="Notifications"
              description="Atur notifikasi penting dari sistem."
            />

            <div className="space-y-3">
              <ToggleField
                label="Email Notifications"
                description="Kirim notifikasi penting melalui email."
                checked={settingsForm.notifications.email_notifications}
                onChange={(value) =>
                  updateNotificationField("email_notifications", value)
                }
              />

              <ToggleField
                label="Task Reminders"
                description="Aktifkan reminder untuk task dan follow up."
                checked={settingsForm.notifications.task_reminders}
                onChange={(value) => updateNotificationField("task_reminders", value)}
              />

              <ToggleField
                label="Finance Alerts"
                description="Alert untuk invoice, payment, cashflow, dan tax."
                checked={settingsForm.notifications.finance_alerts}
                onChange={(value) => updateNotificationField("finance_alerts", value)}
              />

              <ToggleField
                label="Stock Alerts"
                description="Alert untuk stok rendah dan inventory movement."
                checked={settingsForm.notifications.stock_alerts}
                onChange={(value) => updateNotificationField("stock_alerts", value)}
              />

              <ToggleField
                label="AI Report Notifications"
                description="Kirim notifikasi saat AI report selesai dibuat."
                checked={settingsForm.notifications.ai_report_notifications}
                onChange={(value) =>
                  updateNotificationField("ai_report_notifications", value)
                }
              />

              <button
                type="button"
                onClick={() => saveAppSettingsMutation.mutate()}
                disabled={saveAppSettingsMutation.isPending}
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-[#0f2a5f] px-5 text-sm font-black text-white transition hover:bg-blue-950 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-blue-700 dark:hover:bg-blue-600"
              >
                {saveAppSettingsMutation.isPending ? (
                  <Loader2 size={17} className="animate-spin" />
                ) : (
                  <Save size={17} />
                )}
                Save Notifications
              </button>
            </div>
          </section>

          <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-900 dark:bg-[#050816]">
            <SectionHeader
              icon={Bot}
              title="AI Assistant"
              description="Atur behavior AI Smart Reporting."
            />

            <div className="space-y-3">
              <ToggleField
                label="Enable AI"
                description="Aktifkan fitur AI assistant di module ERP."
                checked={settingsForm.ai.ai_enabled}
                onChange={(value) => updateAIField("ai_enabled", value)}
              />

              <ToggleField
                label="Smart Report"
                description="AI membuat insight otomatis dari data bisnis."
                checked={settingsForm.ai.smart_report_enabled}
                onChange={(value) => updateAIField("smart_report_enabled", value)}
              />

              <ToggleField
                label="Auto Summary"
                description="Ringkas data dashboard/module secara otomatis."
                checked={settingsForm.ai.auto_summary_enabled}
                onChange={(value) => updateAIField("auto_summary_enabled", value)}
              />

              <SelectField
                label="Response Tone"
                value={settingsForm.ai.response_tone}
                onChange={(value) => updateAIField("response_tone", value)}
                options={[
                  { label: "Professional", value: "professional" },
                  { label: "Simple", value: "simple" },
                  { label: "Analytical", value: "analytical" },
                  { label: "Executive", value: "executive" },
                ]}
              />

              <SelectField
                label="Report Frequency"
                value={settingsForm.ai.report_frequency}
                onChange={(value) => updateAIField("report_frequency", value)}
                options={[
                  { label: "Daily", value: "daily" },
                  { label: "Weekly", value: "weekly" },
                  { label: "Monthly", value: "monthly" },
                  { label: "Manual Only", value: "manual" },
                ]}
              />

              <button
                type="button"
                onClick={() => saveAppSettingsMutation.mutate()}
                disabled={saveAppSettingsMutation.isPending}
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-[#0f2a5f] px-5 text-sm font-black text-white transition hover:bg-blue-950 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-blue-700 dark:hover:bg-blue-600"
              >
                {saveAppSettingsMutation.isPending ? (
                  <Loader2 size={17} className="animate-spin" />
                ) : (
                  <Save size={17} />
                )}
                Save AI Settings
              </button>
            </div>
          </section>

          <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-900 dark:bg-[#050816]">
            <SectionHeader
              icon={KeyRound}
              title="Security"
              description="Update password akun current user."
            />

            <form
              className="space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
                changePasswordMutation.mutate();
              }}
            >
              <Field
                label="Current Password"
                type="password"
                value={securityForm.current_password}
                placeholder="Password lama"
                onChange={(value) => updateSecurityField("current_password", value)}
              />

              <Field
                label="New Password"
                type="password"
                value={securityForm.new_password}
                placeholder="Minimal 8 karakter"
                onChange={(value) => updateSecurityField("new_password", value)}
              />

              <Field
                label="Confirm Password"
                type="password"
                value={securityForm.confirm_password}
                placeholder="Ulangi password baru"
                onChange={(value) => updateSecurityField("confirm_password", value)}
              />

              <button
                type="submit"
                disabled={changePasswordMutation.isPending}
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 text-sm font-black text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
              >
                {changePasswordMutation.isPending ? (
                  <Loader2 size={17} className="animate-spin" />
                ) : (
                  <ShieldCheck size={17} />
                )}
                Change Password
              </button>

              {changePasswordMutation.isError ? (
                <p className="text-sm font-bold text-rose-600">
                  {getErrorMessage(changePasswordMutation.error)}
                </p>
              ) : null}
            </form>
          </section>
        </div>
      </section>
    </div>
  );
}