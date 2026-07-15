"use client";

import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { api, bootstrapAccessToken } from "@/lib/api";

import type {
  DashboardRealtimeEvent,
  DashboardRealtimeState,
} from "./types";

const INITIAL_RECONNECT_DELAY = 1_000;
const MAX_RECONNECT_DELAY = 30_000;
const HEARTBEAT_INTERVAL = 25_000;

type RealtimeTicketResponse = {
  ticket: string;
  expires_in: number;
};

const moduleQueryKeys: Record<string, string[]> = {
  products: ["product"],
  product: ["product"],
  finance: ["finance"],
  hr: ["hr"],
  crm: ["crm"],
  automation: ["automation"],
  company: ["companies", "company-profile"],
  users: ["admin"],
};

function buildRealtimeUrl(ticket: string, companyId: string): string {
  const configuredWebSocketUrl = process.env.NEXT_PUBLIC_WS_URL;
  const configuredApiUrl =
    process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  const sourceUrl = configuredWebSocketUrl || configuredApiUrl;
  const url = new URL(sourceUrl, window.location.origin);

  if (!configuredWebSocketUrl || url.pathname === "/") {
    url.pathname = "/realtime/ws";
  }

  url.protocol = ["https:", "wss:"].includes(url.protocol) ? "wss:" : "ws:";
  url.search = "";
  url.searchParams.set("ticket", ticket);

  if (companyId !== "all") {
    url.searchParams.set("company_id", companyId);
  }

  return url.toString();
}

async function createRealtimeTicket(companyId: string): Promise<string> {
  await bootstrapAccessToken();
  const response = await api.post<RealtimeTicketResponse>(
    "/realtime/ticket",
    {},
    {
      params: companyId === "all" ? undefined : { company_id: companyId },
    },
  );

  if (!response.data.ticket) {
    throw new Error("Realtime ticket tidak tersedia.");
  }

  return response.data.ticket;
}

function isBusinessEvent(event: DashboardRealtimeEvent): boolean {
  return !["connection.success", "pong", "error"].includes(event.type);
}

export function useDashboardRealtime(companyId: string): DashboardRealtimeState {
  const queryClient = useQueryClient();
  const [state, setState] = useState<DashboardRealtimeState>({
    status:
      typeof navigator !== "undefined" && !navigator.onLine
        ? "offline"
        : "connecting",
    lastEventAt: null,
  });

  useEffect(() => {
    let socket: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
    let reconnectAttempt = 0;
    let disposed = false;

    function clearTimers() {
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (heartbeatTimer) clearInterval(heartbeatTimer);
      reconnectTimer = null;
      heartbeatTimer = null;
    }

    function closeSocket() {
      if (!socket) return;
      socket.onclose = null;
      socket.close();
      socket = null;
    }

    function scheduleReconnect() {
      if (disposed || reconnectTimer || !navigator.onLine) return;
      setState((current) => ({ ...current, status: "reconnecting" }));
      const jitter = Math.floor(Math.random() * 350);
      const delay =
        Math.min(
          INITIAL_RECONNECT_DELAY * 2 ** reconnectAttempt,
          MAX_RECONNECT_DELAY,
        ) + jitter;
      reconnectAttempt += 1;
      reconnectTimer = setTimeout(() => {
        reconnectTimer = null;
        void connect();
      }, delay);
    }

    async function invalidateForEvent(event: DashboardRealtimeEvent) {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
        queryClient.invalidateQueries({ queryKey: ["ai-report"] }),
      ]);

      const moduleName = String(event.module ?? "").toLowerCase();
      await Promise.all(
        (moduleQueryKeys[moduleName] ?? []).map((key) =>
          queryClient.invalidateQueries({ queryKey: [key] }),
        ),
      );
    }

    async function connect() {
      if (disposed || !navigator.onLine || document.hidden) return;
      clearTimers();
      closeSocket();
      setState((current) => ({
        ...current,
        status: reconnectAttempt > 0 ? "reconnecting" : "connecting",
      }));

      try {
        const ticket = await createRealtimeTicket(companyId);
        if (disposed) return;

        socket = new WebSocket(buildRealtimeUrl(ticket, companyId));
        socket.onopen = () => {
          reconnectAttempt = 0;
          setState((current) => ({ ...current, status: "connected" }));
          heartbeatTimer = setInterval(() => {
            if (socket?.readyState === WebSocket.OPEN) {
              socket.send(JSON.stringify({ type: "ping" }));
            }
          }, HEARTBEAT_INTERVAL);
        };

        socket.onmessage = (message) => {
          try {
            const event = JSON.parse(String(message.data)) as DashboardRealtimeEvent;
            if (!isBusinessEvent(event)) return;
            setState({ status: "connected", lastEventAt: Date.now() });
            void invalidateForEvent(event);
          } catch {
            // Frame invalid diabaikan tanpa menjatuhkan koneksi.
          }
        };

        socket.onerror = () => socket?.close();
        socket.onclose = () => {
          if (heartbeatTimer) clearInterval(heartbeatTimer);
          heartbeatTimer = null;
          if (!disposed) scheduleReconnect();
        };
      } catch {
        scheduleReconnect();
      }
    }

    function handleOnline() {
      setState((current) => ({ ...current, status: "reconnecting" }));
      void connect();
    }

    function handleOffline() {
      clearTimers();
      closeSocket();
      setState((current) => ({ ...current, status: "offline" }));
    }

    function handleVisibility() {
      if (document.hidden) {
        clearTimers();
        closeSocket();
        setState((current) => ({ ...current, status: "disconnected" }));
      } else if (navigator.onLine) {
        void connect();
      }
    }

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    document.addEventListener("visibilitychange", handleVisibility);
    void connect();

    return () => {
      disposed = true;
      clearTimers();
      closeSocket();
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [companyId, queryClient]);

  return state;
}
