import { env } from "@/env";
import { getSession, setSession } from "@/lib/session";
import { refreshAccessToken } from "@/lib/oauth";
import { API_VERSION } from "@/lib/playbook";

export type FanvueSession = {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
  tokenType?: string;
  scope?: string;
};

export async function getFreshSession(): Promise<FanvueSession | null> {
  let session = await getSession();
  if (!session) return null;

  if (Date.now() >= session.expiresAt - 30_000 && session.refreshToken) {
    try {
      const refreshed = await refreshAccessToken(session.refreshToken);
      const updatedSession: FanvueSession = {
        accessToken: refreshed.access_token,
        refreshToken: refreshed.refresh_token ?? session.refreshToken,
        tokenType: refreshed.token_type,
        scope: refreshed.scope ?? session.scope,
        expiresAt: Date.now() + refreshed.expires_in * 1000,
      };
      await setSession(updatedSession);
      session = updatedSession;
    } catch (error) {
      console.error("Fanvue token refresh failed", error);
      return null;
    }
  }

  return session;
}

export async function getAccessToken(): Promise<string | null> {
  const session = await getFreshSession();
  return session?.accessToken ?? null;
}

export async function fanvueFetch(path: string, init: RequestInit = {}) {
  const token = await getAccessToken();
  if (!token) {
    return { ok: false as const, status: 401, data: { error: "Not signed in to Fanvue" } };
  }

  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${token}`);
  headers.set("X-Fanvue-API-Version", API_VERSION);
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(`${env.API_BASE_URL}${path}`, {
    ...init,
    headers,
    cache: "no-store",
  });

  const text = await res.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { error: text };
    }
  }

  return { ok: res.ok, status: res.status, data };
}

export function asArray(payload: unknown): Array<Record<string, unknown>> {
  if (Array.isArray(payload)) return payload as Array<Record<string, unknown>>;
  if (payload && typeof payload === "object" && "data" in payload) {
    const data = (payload as { data: unknown }).data;
    if (Array.isArray(data)) return data as Array<Record<string, unknown>>;
  }
  return [];
}

export function asRecord(payload: unknown): Record<string, unknown> | null {
  if (payload && typeof payload === "object" && !Array.isArray(payload)) {
    return payload as Record<string, unknown>;
  }
  return null;
}

export async function getCurrentUser() {
  const result = await fanvueFetch("/users/me");
  if (!result.ok) return null;
  return result.data as { handle?: string; uuid?: string; displayName?: string } | null;
}

export async function getAccount() {
  const result = await fanvueFetch("/users/account");
  if (!result.ok) return null;
  return result.data as {
    handle?: string;
    displayName?: string;
    account?: {
      status?: string;
      subscriptionPrice?: number | null;
      earnings?: { total?: number; availableBalance?: number };
      fans?: { followers?: number; subscribers?: number };
    };
  };
}

export async function getPostsPreview() {
  const result = await fanvueFetch("/posts?page=1&size=15");
  if (!result.ok) return null;
  return result.data as { data?: unknown[]; pagination?: { hasMore?: boolean } };
}

export async function getSessionScopes(): Promise<string[]> {
  const session = await getSession();
  const raw = session?.scope ?? "";
  return raw.split(/\s+/).filter(Boolean);
}
