import { seedTrafficChecklist } from "@/lib/ops/fixtures";
import { agentModeForPhase } from "@/lib/ops/phase";
import type { AgentRunResult, FanvueMe, OpsState, Phase } from "@/lib/ops/types";

export function runTrafficAgent(input: {
  state: OpsState;
  phase: Phase;
  user: FanvueMe | null;
  nowIso: string;
}): { state: OpsState; result: AgentRunResult } {
  void input.user;
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
  const active = state.trafficReminders.filter((r) => r.status !== "dismissed");
  const hasWhere = active.some((r) => r.id === "traffic-where-to-post");
  if (active.length === 0) {
    state = { ...state, trafficReminders: seedTrafficChecklist(input.nowIso) };
    draftsCreated = state.trafficReminders.length;
  } else if (!hasWhere) {
    const add = seedTrafficChecklist(input.nowIso).filter((r) => r.id === "traffic-where-to-post");
    state = { ...state, trafficReminders: [...state.trafficReminders, ...add] };
    draftsCreated = add.length;
  }

  return {
    state,
    result: {
      agent: "traffic",
      enabled: true,
      mode,
      skipped: undefined,
      summary:
        "TrafficAgent lite: where to post / what to say checklist only. No scraping, no bought engagement, no multi-channel spam, no ads in Phase 0/1.",
      draftsCreated,
    },
  };
}
