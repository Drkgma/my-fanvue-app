import { seedMoneyMenu } from "@/lib/ops/fixtures";
import { agentModeForPhase } from "@/lib/ops/phase";
import type { AgentRunResult, FanvueMe, OpsState, Phase } from "@/lib/ops/types";

export function runMoneyBot(input: {
  state: OpsState;
  phase: Phase;
  user: FanvueMe | null;
  nowIso: string;
}): { state: OpsState; result: AgentRunResult } {
  const mode = agentModeForPhase("money", input.phase);
  if (mode === "off") {
    return {
      state: input.state,
      result: {
        agent: "money",
        enabled: false,
        mode,
        skipped: "phase_gated",
        summary: "MoneyBot is off until Phase 1 (one ahead of Phase 0).",
        draftsCreated: 0,
      },
    };
  }

  let state = input.state;
  let draftsCreated = 0;
  if (state.moneySuggestions.length === 0) {
    state = { ...state, moneySuggestions: seedMoneyMenu(input.nowIso) };
    draftsCreated = state.moneySuggestions.length;
  }

  const skipped = input.user ? undefined : "waiting_for_login";
  return {
    state,
    result: {
      agent: "money",
      enabled: true,
      mode,
      skipped,
      summary:
        "MoneyBot lite: 3-item PPV/tip menu only. No dynamic pricing, no broadcasts, no $1M targets. Send offers by hand if someone is already chatting.",
      draftsCreated,
    },
  };
}
