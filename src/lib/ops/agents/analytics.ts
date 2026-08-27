import { listSubscriberInsights, type SessionTokens } from "@/lib/ops/fanvue-client";
import { agentModeForPhase } from "@/lib/ops/phase";
import type { AgentRunResult, AnalyticsEvent, FanvueMe, OpsState, Phase } from "@/lib/ops/types";

function alreadySnapshottedToday(state: OpsState, now: Date) {
  const day = now.toISOString().slice(0, 10);
  return state.analyticsLog.some((e) => e.at.slice(0, 10) === day);
}

export async function runAnalyticsAgent(input: {
  state: OpsState;
  phase: Phase;
  subscriberCount: number;
  user: FanvueMe | null;
  session: SessionTokens | null;
  now: Date;
}): Promise<{ state: OpsState; result: AgentRunResult }> {
  const mode = agentModeForPhase("analytics", input.phase);
  const nowIso = input.now.toISOString();

  if (alreadySnapshottedToday(input.state, input.now)) {
    return {
      state: input.state,
      result: {
        agent: "analytics",
        enabled: true,
        mode,
        skipped: "not_applicable",
        summary: "AnalyticsAgent: daily snapshot already recorded.",
        draftsCreated: 0,
      },
    };
  }

  let source: AnalyticsEvent["source"] = input.user ? "users/me" : "fixture";
  let skipped: AgentRunResult["skipped"] = input.user ? undefined : "waiting_for_login";
  let revenueNote = "Revenue APIs need extra scopes; not guessed.";

  if (input.user?.uuid) {
    const insights = await listSubscriberInsights(input.session, input.user.uuid);
    if (insights.ok) {
      source = "insights";
      revenueNote = "Subscriber insight series fetched; revenue still not inferred.";
    } else {
      skipped = insights.reason;
      revenueNote = insights.message;
    }
  }

  const event: AnalyticsEvent = {
    id: `snap-${nowIso}`,
    at: nowIso,
    source,
    phase: input.phase,
    subscriberCount: input.subscriberCount,
    followerCount: input.user?.fanCounts?.followersCount ?? null,
    postCount: input.user?.contentCounts?.postCount ?? null,
    revenueNote,
    skipped,
  };

  const analyticsLog = [...input.state.analyticsLog, event].slice(-90);

  return {
    state: { ...input.state, analyticsLog },
    result: {
      agent: "analytics",
      enabled: true,
      mode,
      skipped,
      summary: `AnalyticsAgent ${mode}: snapshot stored (subs=${input.subscriberCount}, source=${source}).`,
      draftsCreated: 1,
    },
  };
}
