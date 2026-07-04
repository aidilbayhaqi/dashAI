import { api } from "@/lib/api";
import { clearAuthSession, setAuthSession } from "@/lib/auth";
import type {
  AuthUser,
  LoginPayload,
  LoginResponse,
  RegisterPayload,
} from "@/types/backend";

export async function login(payload: LoginPayload) {
  const response = await api.post<LoginResponse>("/api/v1/auth/login", payload);

  setAuthSession(response.data.token, response.data.user);

  return response.data;
}

export async function register(payload: RegisterPayload) {
  const response = await api.post<LoginResponse>(
    "/api/v1/auth/register",
    payload
  );

  setAuthSession(response.data.token, response.data.user);

  return response.data;
}

export async function getMe() {
  const response = await api.get<AuthUser>("/api/v1/auth/me");
  return response.data;
}

export async function logout() {
  const refreshToken = sessionStorage.getItem("dashai_refresh_token");

  try {
    await api.post("/api/v1/auth/logout", {
      refresh_token: refreshToken,
    });
  } finally {
    clearAuthSession();
  }
}