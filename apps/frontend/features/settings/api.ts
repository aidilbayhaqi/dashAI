import { api } from "@/lib/api";

export type SettingsRow = Record<string, unknown>;

export type UserSettingsPayload = {
  name?: string;
  full_name?: string;
  email?: string;
  phone?: string;
};

export type WorkspaceSettingsPayload = {
  currency: string;
  language: string;
  timezone: string;
  date_format: string;
  number_format: string;
};

export type NotificationSettingsPayload = {
  email_notifications: boolean;
  task_reminders: boolean;
  finance_alerts: boolean;
  stock_alerts: boolean;
  ai_report_notifications: boolean;
};

export type AISettingsPayload = {
  ai_enabled: boolean;
  smart_report_enabled: boolean;
  auto_summary_enabled: boolean;
  response_tone: string;
  report_frequency: string;
};

export type SecurityPayload = {
  current_password: string;
  new_password: string;
  confirm_password: string;
};

export type AppSettingsPayload = {
  workspace: WorkspaceSettingsPayload;
  notifications: NotificationSettingsPayload;
  ai: AISettingsPayload;
};

export const SETTINGS_STORAGE_KEY = "dashai_app_settings";

export const defaultWorkspaceSettings: WorkspaceSettingsPayload = {
  currency: "IDR",
  language: "id",
  timezone: "Asia/Jakarta",
  date_format: "DD/MM/YYYY",
  number_format: "id-ID",
};

export const defaultNotificationSettings: NotificationSettingsPayload = {
  email_notifications: true,
  task_reminders: true,
  finance_alerts: true,
  stock_alerts: true,
  ai_report_notifications: true,
};

export const defaultAISettings: AISettingsPayload = {
  ai_enabled: true,
  smart_report_enabled: true,
  auto_summary_enabled: true,
  response_tone: "professional",
  report_frequency: "daily",
};

export const defaultAppSettings: AppSettingsPayload = {
  workspace: defaultWorkspaceSettings,
  notifications: defaultNotificationSettings,
  ai: defaultAISettings,
};

type ApiObjectResponse = {
  data?: unknown;
  user?: unknown;
  settings?: unknown;
  profile?: unknown;
};

function normalizeObject(data: unknown): SettingsRow | null {
  if (!data || typeof data !== "object") return null;

  const record = data as ApiObjectResponse;

  if (record.data && typeof record.data === "object" && !Array.isArray(record.data)) {
    return record.data as SettingsRow;
  }

  if (record.user && typeof record.user === "object" && !Array.isArray(record.user)) {
    return record.user as SettingsRow;
  }

  if (
    record.profile &&
    typeof record.profile === "object" &&
    !Array.isArray(record.profile)
  ) {
    return record.profile as SettingsRow;
  }

  if (
    record.settings &&
    typeof record.settings === "object" &&
    !Array.isArray(record.settings)
  ) {
    return record.settings as SettingsRow;
  }

  return data as SettingsRow;
}

function mergeSettings(value: Partial<AppSettingsPayload>): AppSettingsPayload {
  return {
    workspace: {
      ...defaultWorkspaceSettings,
      ...(value.workspace ?? {}),
    },
    notifications: {
      ...defaultNotificationSettings,
      ...(value.notifications ?? {}),
    },
    ai: {
      ...defaultAISettings,
      ...(value.ai ?? {}),
    },
  };
}

export function getLocalAppSettings(): AppSettingsPayload {
  if (typeof window === "undefined") return defaultAppSettings;

  try {
    const raw = window.localStorage.getItem(SETTINGS_STORAGE_KEY);

    if (!raw) return defaultAppSettings;

    const parsed = JSON.parse(raw) as Partial<AppSettingsPayload>;

    return mergeSettings(parsed);
  } catch {
    return defaultAppSettings;
  }
}

export function saveLocalAppSettings(settings: AppSettingsPayload) {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
}

async function requestFirst<T>(requests: Array<() => Promise<T>>, fallback: T) {
  for (const request of requests) {
    try {
      return await request();
    } catch {
      // coba endpoint berikutnya
    }
  }

  return fallback;
}

export async function getCurrentUserSettings() {
  return requestFirst<SettingsRow | null>(
    [
      async () => normalizeObject((await api.get("/api/v1/auth/me")).data),
      async () => normalizeObject((await api.get("/api/v1/users/me")).data),
      async () => normalizeObject((await api.get("/api/v1/me")).data),
      async () => normalizeObject((await api.get("/api/v1/profile")).data),
    ],
    null
  );
}

export async function updateCurrentUserSettings(payload: UserSettingsPayload) {
  return requestFirst<SettingsRow | null>(
    [
      async () => normalizeObject((await api.patch("/api/v1/users/me", payload)).data),
      async () => normalizeObject((await api.patch("/api/v1/profile", payload)).data),
      async () => normalizeObject((await api.patch("/api/v1/auth/me", payload)).data),
    ],
    null
  );
}

export async function getRemoteAppSettings() {
  return requestFirst<AppSettingsPayload | null>(
    [
      async () => {
        const response = await api.get("/api/v1/settings");
        const object = normalizeObject(response.data);
        return object ? mergeSettings(object as Partial<AppSettingsPayload>) : null;
      },
      async () => {
        const response = await api.get("/api/v1/user/settings");
        const object = normalizeObject(response.data);
        return object ? mergeSettings(object as Partial<AppSettingsPayload>) : null;
      },
    ],
    null
  );
}

export async function saveRemoteAppSettings(settings: AppSettingsPayload) {
  return requestFirst<SettingsRow | null>(
    [
      async () => normalizeObject((await api.patch("/api/v1/settings", settings)).data),
      async () =>
        normalizeObject((await api.patch("/api/v1/user/settings", settings)).data),
      async () => normalizeObject((await api.post("/api/v1/settings", settings)).data),
    ],
    null
  );
}

export async function changePassword(payload: SecurityPayload) {
  if (payload.new_password !== payload.confirm_password) {
    throw new Error("Konfirmasi password tidak sama.");
  }

  if (payload.new_password.length < 8) {
    throw new Error("Password baru minimal 8 karakter.");
  }

  return requestFirst<SettingsRow | null>(
    [
      async () =>
        normalizeObject(
          (await api.post("/api/v1/auth/change-password", payload)).data
        ),
      async () =>
        normalizeObject((await api.patch("/api/v1/users/me/password", payload)).data),
      async () =>
        normalizeObject((await api.post("/api/v1/profile/change-password", payload)).data),
    ],
    null
  );
}

export function getSettingString(
  row: SettingsRow | null | undefined,
  keys: string[],
  fallback = ""
) {
  if (!row) return fallback;

  for (const key of keys) {
    const value = row[key];

    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return String(value);
    }
  }

  return fallback;
}