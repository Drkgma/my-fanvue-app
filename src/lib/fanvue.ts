import { env } from "@/env";
import { getSession, setSession } from "@/lib/session";
import { refreshAccessToken } from "@/lib/oauth";
import { API_VERSION } from "@/lib/playbook";

export async function getAccessToken(): Promise<string | null> {
  let session = await getSession();
  if (!session) return null;

  if (Date.now() >= session.expiresAt - 30_000 && session.refreshToken) {
    try {
      const refreshed = await refreshAccessToken(session.refreshToken);
      const updatedSession = {
        accessToken: refreshed.access_token,
        refreshToken: refreshed.refresh_token ?? session.refreshToken,
        tokenType: refreshed.token_type,
        scope: refreshed.scope ?? session.scope,
        expiresAt: Date.now() + refreshed.expires_in * 1000,
      };
      await setSession(updatedSession);
      session = updatedSession;
    } catch {
      return null;
    }
  }

  return session.accessToken;
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
  return result.data;
}
