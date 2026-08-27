import { seedTrafficChecklist } from "@/lib/ops/fixtures";
import { agentModeForPhase } from "@/lib/ops/phase";
import type { AgentRunResult, FanvueMe, OpsState, Phase } from "@/lib/ops/types";

export function runTrafficAgent(input: {
  state: OpsState;
  phase: Phase;
  user: FanvueMe | null;
  nowIso: string;
}): { state: OpsState; result: AgentRunResult } {
  const mode = agentModeForPhase("traffic", input.phase);
  if (mode === "off") {
    return {
      state: input.state,
      result: {
        agent: "traffic",
        enabled: false,
        mode,
        skipped: "phase_gated",
        summary: "TrafficAgent is off this phase.",
        draftsCreated: 0,
      },
    };
  }

  let state = input.state;
  let draftsCreated = 0;
  if (state.trafficReminders.filter((r) => r.status !== "dismissed").length === 0) {
    state = { ...state, trafficReminders: seedTrafficChecklist(input.nowIso) };
    draftsCreated = state.trafficReminders.length;
  }

  return {
    state,
    result: {
      agent: "traffic",
      enabled: true,
      mode,
      skipped: input.user ? undefined : "waiting_for_login",
      summary:
        "TrafficAgent lite: compliant promo checklist only. No scraping, no bought engagement, no multi-channel spam, no ads in Phase 0/1.",
      draftsCreated,
    },
  };
}
