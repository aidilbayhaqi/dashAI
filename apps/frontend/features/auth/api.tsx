import { api } from "@/lib/api";
import type { LoginPayload, LoginResponse } from "./types";

export async function login(payload: LoginPayload) {
  const response = await api.post<LoginResponse>("/api/v1/auth/login", payload);
  return response.data;
}