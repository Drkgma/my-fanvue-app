import { env } from "@/env";
import { getSession, setSession } from "@/lib/session";
import { refreshAccessToken } from "@/lib/oauth";
import { FANVUE_API_VERSION, type FanvueMe } from "@/lib/ops/types";
import { asMe } from "@/lib/ops/fanvue-client";
import type { SessionTokens } from "@/lib/ops/fanvue-client";

export async function getSessionTokens(): Promise<SessionTokens | null> {
  const session = await getSession();
  if (!session?.accessToken) return null;
  return { accessToken: session.accessToken, scope: session.scope };
}

export async function getCurrentUser(): Promise<FanvueMe | null> {
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
    } catch {}
  }

  try {
    const res = await fetch(`${env.API_BASE_URL}/users/me`, {
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
        "X-Fanvue-API-Version": FANVUE_API_VERSION,
        Accept: "application/json",
      },
      cache: "no-store",
    });
    if (!res.ok) return null;
    return asMe(await res.json());
  } catch (error) {
    console.log("error", error);
    return null;
  }
}
