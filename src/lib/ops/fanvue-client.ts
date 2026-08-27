import { env } from "@/env";
import { FANVUE_API_VERSION, type FanvueMe } from "@/lib/ops/types";

export type SessionTokens = {
  accessToken: string;
  scope?: string;
};

export type ApiSkip = {
  ok: false;
  skipped: true;
  reason: "waiting_for_login" | "missing_scope" | "api_error";
  status?: number;
  message: string;
};

export type ApiOk<T> = { ok: true; skipped: false; data: T };

export type ApiResult<T> = ApiOk<T> | ApiSkip;

export function parseGrantedScopes(scope: string | undefined): string[] {
  if (!scope) return [];
  return scope.split(/[\s,]+/).filter(Boolean);
}

function hasScope(granted: string[], needed: string[]) {
  return needed.every((s) => granted.includes(s));
}

export async function fanvueGet<T>(
  path: string,
  session: SessionTokens | null,
  requiredScopes: string[],
): Promise<ApiResult<T>> {
  if (!session?.accessToken) {
    return {
      ok: false,
      skipped: true,
      reason: "waiting_for_login",
      message: "Waiting for Fanvue login. Jobs will not call write APIs.",
    };
  }

  const granted = parseGrantedScopes(session.scope);
  // Token scope may omit defaults; also accept OAUTH_SCOPES from env as requested scopes.
  const effective = granted.length ? granted : env.OAUTH_SCOPES.split(/[\s,]+/).filter(Boolean);
  if (requiredScopes.length && !hasScope(effective, requiredScopes)) {
    return {
      ok: false,
      skipped: true,
      reason: "missing_scope",
      message: `Skipped ${path}: need ${requiredScopes.join(", ")}. Token has ${effective.join(", ") || "(none)"}.`,
    };
  }

  try {
    const res = await fetch(`${env.API_BASE_URL}${path}`, {
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
        "X-Fanvue-API-Version": FANVUE_API_VERSION,
        Accept: "application/json",
      },
      cache: "no-store",
    });
    if (res.status === 401 || res.status === 403) {
      return {
        ok: false,
        skipped: true,
        reason: res.status === 401 ? "waiting_for_login" : "missing_scope",
        status: res.status,
        message: `Fanvue ${res.status} on ${path} — skipped (no crash).`,
      };
    }
    if (!res.ok) {
      return {
        ok: false,
        skipped: true,
        reason: "api_error",
        status: res.status,
        message: `Fanvue ${res.status} on ${path} — skipped.`,
      };
    }
    return { ok: true, skipped: false, data: (await res.json()) as T };
  } catch (error) {
    return {
      ok: false,
      skipped: true,
      reason: "api_error",
      message: `Network error on ${path}: ${error instanceof Error ? error.message : "unknown"}`,
    };
  }
}

export type PostsList = { data?: Array<{ uuid?: string; caption?: string; createdAt?: string }> };
export type ChatsList = {
  data?: Array<{ uuid?: string; isRead?: boolean; lastMessageAt?: string | null }>;
};
export type InsightsSubscribers = { data?: unknown[]; total?: number };

export function listPosts(session: SessionTokens | null) {
  return fanvueGet<PostsList>("/posts?page=1&size=15", session, ["read:post"]);
}

export function listCreatorChats(session: SessionTokens | null, creatorUuid: string) {
  return fanvueGet<ChatsList>(
    `/creators/${creatorUuid}/chats?page=1&size=15`,
    session,
    ["read:chat"],
  );
}

export function listCreatorSubscribers(session: SessionTokens | null, creatorUuid: string) {
  return fanvueGet<{ data?: unknown[]; pagination?: unknown }>(
    `/creators/${creatorUuid}/subscribers?page=1&size=15`,
    session,
    ["read:creator", "read:fan"],
  );
}

export function listSubscriberInsights(session: SessionTokens | null, creatorUuid: string) {
  return fanvueGet<InsightsSubscribers>(
    `/creators/${creatorUuid}/insights/subscribers?page=1&size=15`,
    session,
    ["read:insights"],
  );
}

export function asMe(value: unknown): FanvueMe | null {
  if (!value || typeof value !== "object") return null;
  return value as FanvueMe;
}
