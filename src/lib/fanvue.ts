import { env } from "@/env";
import { FANVUE_API_VERSION } from "@/lib/growth";
import { getSession, setSession } from "@/lib/session";
import { refreshAccessToken } from "@/lib/oauth";

export type FanvueSession = {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
  tokenType?: string;
  scope?: string;
};

async function getFreshSession(): Promise<FanvueSession | null> {
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

export async function fanvueFetch(path: string): Promise<Response> {
  const session = await getFreshSession();
  if (!session) {
    return new Response(JSON.stringify({ error: "not_authenticated" }), { status: 401 });
  }
  return fetch(`${env.API_BASE_URL}${path}`, {
    headers: {
      Authorization: `Bearer ${session.accessToken}`,
      "X-Fanvue-API-Version": FANVUE_API_VERSION,
    },
    cache: "no-store",
  });
}

export async function getCurrentUser() {
  try {
    const res = await fanvueFetch("/users/me");
    if (res.status === 401) return null;
    if (!res.ok) {
      console.error("GET /users/me failed", res.status, await res.text());
      return null;
    }
    return res.json();
  } catch (error) {
    console.error("getCurrentUser", error);
    return null;
  }
}

export async function getAccount() {
  const res = await fanvueFetch("/users/account");
  if (!res.ok) return null;
  return res.json() as Promise<{
    handle?: string;
    displayName?: string;
    account?: {
      status?: string;
      subscriptionPrice?: number | null;
      earnings?: { total?: number; availableBalance?: number };
      fans?: { followers?: number; subscribers?: number };
    };
  }>;
}

export async function getPostsPreview() {
  const res = await fanvueFetch("/posts?page=1&size=15");
  if (!res.ok) return null;
  return res.json() as Promise<{ data?: unknown[]; pagination?: { hasMore?: boolean } }>;
}

export async function getSessionScopes(): Promise<string[]> {
  const session = await getSession();
  const raw = session?.scope ?? "";
  return raw.split(/\s+/).filter(Boolean);
}
