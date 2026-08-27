import { MONEY_LADDER_IDS, seedMoneyMenu } from "@/lib/ops/fixtures";
import { agentModeForPhase } from "@/lib/ops/phase";
import type { AgentRunResult, FanvueMe, OpsState, Phase } from "@/lib/ops/types";

export function runMoneyBot(input: {
  state: OpsState;
  phase: Phase;
  user: FanvueMe | null;
  nowIso: string;
}): { state: OpsState; result: AgentRunResult } {
  void input.user;
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
  const hasLadder = MONEY_LADDER_IDS.every((id) => state.moneySuggestions.some((s) => s.id === id));
  if (!hasLadder) {
    state = { ...state, moneySuggestions: seedMoneyMenu(input.nowIso) };
    draftsCreated = state.moneySuggestions.length;
  }

  return {
    state,
    result: {
      agent: "money",
      enabled: true,
      mode,
      skipped: undefined,
      summary:
        "MoneyBot lite: beginner ladder — $6.99 sub + trial, $5 tip, $9 first PPV. No broadcasts, no $1M pricing. You send offers by hand in existing chats.",
      draftsCreated,
    },
  };
}
