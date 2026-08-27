import { env } from "@/env";
import { cooldownStatus } from "@/lib/ops/cooldown";
import { parseGrantedScopes, type SessionTokens } from "@/lib/ops/fanvue-client";
import { agentModeForPhase, detectPhase, PHASE_LABELS, realisticEnvelope } from "@/lib/ops/phase";
import { buildTodayPlan } from "@/lib/ops/plan";
import { loadState } from "@/lib/ops/store";
import { IMPLEMENTATION_ORDER, type FanvueMe } from "@/lib/ops/types";

function present(value: string | undefined | null) {
  return Boolean(value && value.trim());
}

export async function buildOpsStatus(input: {
  user: FanvueMe | null;
  session: SessionTokens | null;
  now?: Date;
}) {
  const now = input.now ?? new Date();
  const detected = detectPhase(input.user);
  const state = await loadState();
  const grantedScopes = parseGrantedScopes(input.session?.scope);
  const requestedScopes = env.OAUTH_SCOPES.split(/[\s,]+/).filter(Boolean);

  const envPresent = {
    OAUTH_CLIENT_ID: present(env.OAUTH_CLIENT_ID),
    OAUTH_CLIENT_SECRET: present(env.OAUTH_CLIENT_SECRET),
    OAUTH_REDIRECT_URI: present(env.OAUTH_REDIRECT_URI),
    OAUTH_SCOPES: present(env.OAUTH_SCOPES),
    SESSION_SECRET: present(env.SESSION_SECRET),
    BASE_URL: present(env.BASE_URL),
    API_BASE_URL: present(env.API_BASE_URL),
    CRON_SECRET: present(process.env.CRON_SECRET),
  };

  const oauth = {
    clientConfigured: envPresent.OAUTH_CLIENT_ID && envPresent.OAUTH_CLIENT_SECRET,
    redirectUri: env.OAUTH_REDIRECT_URI ?? null,
    redirectUriHint:
      "Register this exact Redirect URI at https://fanvue.com/developers, then click Login with Fanvue.",
    requestedScopes,
    tokenScopes: grantedScopes,
    userLoggedIn: Boolean(input.user),
    waitingForLogin: !input.user,
  };

  const automations = IMPLEMENTATION_ORDER.map((id) => {
    const mode = agentModeForPhase(id, detected.phase);
    return {
      id,
      mode,
      enabled: mode !== "off",
      reason:
        mode === "off"
          ? `Not in current phase ${detected.phase} + one ahead`
          : mode === "lite"
            ? "Lite: drafts/checklists only; no live send/publish"
            : "Active for this phase",
    };
  });

  return {
    app: "fanvue-ops",
    at: now.toISOString(),
    envPresent,
    oauth,
    phase: {
      ...detected,
      label: PHASE_LABELS[detected.phase],
      envelope: realisticEnvelope(detected.phase),
    },
    cooldown: cooldownStatus(state, now),
    automations,
    lastTickAt: state.lastTickAt,
    todayPlan:
      state.todayPlan ??
      buildTodayPlan({
        state,
        phase: detected.phase,
        subscriberCount: detected.subscriberCount,
        waitingForLogin: !input.user,
        user: input.user,
        now,
      }),
    counts: {
      contentDrafts: state.contentDrafts.filter((d) => d.status !== "dismissed").length,
      chatDrafts: state.chatDrafts.filter((d) => d.status !== "dismissed").length,
      moneySuggestions: state.moneySuggestions.length,
      trafficReminders: state.trafficReminders.filter((r) => r.status === "open").length,
      analyticsEvents: state.analyticsLog.length,
    },
    humanStepsRemaining: input.user
      ? []
      : [
          "Add redirect URI http://localhost:3000/api/oauth/callback at https://fanvue.com/developers",
          "Click Login with Fanvue",
        ],
  };
}
