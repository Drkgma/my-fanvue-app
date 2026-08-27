import { runAnalyticsAgent } from "@/lib/ops/agents/analytics";
import { runChatMate } from "@/lib/ops/agents/chatmate";
import { runContentAgent } from "@/lib/ops/agents/content";
import { runMoneyBot } from "@/lib/ops/agents/money";
import { runTrafficAgent } from "@/lib/ops/agents/traffic";
import { cooldownStatus } from "@/lib/ops/cooldown";
import { parseGrantedScopes, type SessionTokens } from "@/lib/ops/fanvue-client";
import { evaluateGuardrail } from "@/lib/ops/guardrails";
import { agentModeForPhase, detectPhase } from "@/lib/ops/phase";
import { buildTodayPlan } from "@/lib/ops/plan";
import { loadState, saveState } from "@/lib/ops/store";
import {
  IMPLEMENTATION_ORDER,
  type AgentId,
  type AgentRunResult,
  type DailyMoneyPlan,
  type FanvueMe,
  type OpsState,
  type Refusal,
} from "@/lib/ops/types";

export type TickInput = {
  user: FanvueMe | null;
  session: SessionTokens | null;
  now?: Date;
  requestText?: string;
};

export type TickReport = {
  at: string;
  phase: ReturnType<typeof detectPhase> & { label: string };
  cooldown: ReturnType<typeof cooldownStatus>;
  grantedScopes: string[];
  results: AgentRunResult[];
  refused: Refusal[];
  waitingForLogin: boolean;
  todayPlan: DailyMoneyPlan;
};

export async function runTick(input: TickInput): Promise<{ state: OpsState; report: TickReport }> {
  const now = input.now ?? new Date();
  const nowIso = now.toISOString();
  const detected = detectPhase(input.user);
  const grantedScopes = parseGrantedScopes(input.session?.scope);
  let state = await loadState();
  const tickRefused: Refusal[] = [];

  const fantasy = evaluateGuardrail({
    kind: "fantasy.million",
    agent: "orchestrator",
    phase: detected.phase,
    user: input.user,
    grantedScopes,
    text: input.requestText,
  });
  if (!fantasy.ok && input.requestText) {
    tickRefused.push({
      id: `ref-${nowIso}`,
      at: nowIso,
      agent: "orchestrator",
      code: fantasy.code,
      message: fantasy.message,
    });
  }

  const results: AgentRunResult[] = [];

  // Implementation order is encoded here. Analytics is last in the product order
  // but a read-only snapshot runs first so other agents see today's numbers.
  const analytics = await runAnalyticsAgent({
    state,
    phase: detected.phase,
    subscriberCount: detected.subscriberCount,
    user: input.user,
    session: input.session,
    now,
  });
  state = analytics.state;

  for (const agent of IMPLEMENTATION_ORDER) {
    if (agent === "analytics") {
      results.push(analytics.result);
      continue;
    }
    if (agentModeForPhase(agent, detected.phase) === "off") {
      results.push({
        agent,
        enabled: false,
        mode: "off",
        skipped: "phase_gated",
        summary: `${agent} not enabled (phase ${detected.phase}; only current + one ahead).`,
        draftsCreated: 0,
      });
      continue;
    }

    if (agent === "content") {
      const r = await runContentAgent({
        state,
        phase: detected.phase,
        user: input.user,
        session: input.session,
        nowIso,
      });
      state = r.state;
      results.push(r.result);
    } else if (agent === "chatmate") {
      const r = await runChatMate({
        state,
        phase: detected.phase,
        user: input.user,
        session: input.session,
        nowIso,
      });
      state = r.state;
      results.push(r.result);
    } else if (agent === "money") {
      const r = runMoneyBot({
        state,
        phase: detected.phase,
        user: input.user,
        nowIso,
      });
      state = r.state;
      results.push(r.result);
    } else if (agent === "traffic") {
      const r = runTrafficAgent({
        state,
        phase: detected.phase,
        user: input.user,
        nowIso,
      });
      state = r.state;
      results.push(r.result);
    }
  }

  const todayPlan = buildTodayPlan({
    state,
    phase: detected.phase,
    subscriberCount: detected.subscriberCount,
    waitingForLogin: !input.user,
    user: input.user,
    now,
  });

  state = {
    ...state,
    lastTickAt: nowIso,
    todayPlan,
    refused: [...state.refused, ...tickRefused].slice(-50),
  };
  await saveState(state);

  return {
    state,
    report: {
      at: nowIso,
      phase: { ...detected, label: phaseLabel(detected.phase) },
      cooldown: cooldownStatus(state, now),
      grantedScopes,
      results,
      refused: tickRefused,
      waitingForLogin: !input.user,
      todayPlan,
    },
  };
}

function phaseLabel(phase: TickReport["phase"]["phase"]) {
  const labels = ["Foundation", "First converts", "Repeatable", "Monetization", "Traffic", "Scale"] as const;
  return labels[phase];
}

export function applyDraftAction(
  state: OpsState,
  action: { type: "dismiss" | "ready"; collection: "content" | "chat" | "traffic"; id: string },
): OpsState {
  if (action.collection === "content") {
    return {
      ...state,
      contentDrafts: state.contentDrafts.map((d) =>
        d.id === action.id ? { ...d, status: action.type === "dismiss" ? "dismissed" : "queued" } : d,
      ),
    };
  }
  if (action.collection === "chat") {
    return {
      ...state,
      chatDrafts: state.chatDrafts.map((d) =>
        d.id === action.id ? { ...d, status: action.type === "dismiss" ? "dismissed" : "ready" } : d,
      ),
    };
  }
  return {
    ...state,
    trafficReminders: state.trafficReminders.map((d) =>
      d.id === action.id
        ? { ...d, status: action.type === "dismiss" ? "dismissed" : "done" }
        : d,
    ),
  };
}

export function tryOutboundRefusal(input: {
  agent: AgentId;
  kind: "content.publish" | "chatmate.send" | "chatmate.mass_dm" | "money.broadcast" | "traffic.campaign";
  user: FanvueMe | null;
  session: SessionTokens | null;
  phase: ReturnType<typeof detectPhase>["phase"];
}) {
  return evaluateGuardrail({
    kind: input.kind,
    agent: input.agent,
    phase: input.phase,
    user: input.user,
    grantedScopes: parseGrantedScopes(input.session?.scope),
  });
}
