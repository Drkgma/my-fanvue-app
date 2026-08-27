import { seedContentPlan } from "@/lib/ops/fixtures";
import { listPosts, type SessionTokens } from "@/lib/ops/fanvue-client";
import { agentModeForPhase } from "@/lib/ops/phase";
import type { AgentRunResult, FanvueMe, OpsState, Phase } from "@/lib/ops/types";

export async function runContentAgent(input: {
  state: OpsState;
  phase: Phase;
  user: FanvueMe | null;
  session: SessionTokens | null;
  nowIso: string;
}): Promise<{ state: OpsState; result: AgentRunResult }> {
  const mode = agentModeForPhase("content", input.phase);
  if (mode === "off") {
    return {
      state: input.state,
      result: {
        agent: "content",
        enabled: false,
        mode,
        skipped: "phase_gated",
        summary: "ContentAgent is off for this phase.",
        draftsCreated: 0,
      },
    };
  }

  let state = input.state;
  let draftsCreated = 0;
  let skipped: AgentRunResult["skipped"];
  let extra = "";

  if (state.contentDrafts.filter((d) => d.status !== "dismissed").length === 0) {
    state = { ...state, contentDrafts: seedContentPlan(input.nowIso) };
    draftsCreated = state.contentDrafts.length;
  }

  if (!input.user) {
    skipped = "waiting_for_login";
    extra = " 7-day plan is local until Fanvue login. Will not publish.";
  } else {
    const posts = await listPosts(input.session);
    if (posts.ok) {
      extra = ` Live GET /posts returned ${posts.data.data?.length ?? 0} item(s). Drafts stay unpublished (no write:post in Phase 0/1).`;
    } else {
      skipped = posts.reason;
      extra = ` ${posts.message}`;
    }
  }

  return {
    state,
    result: {
      agent: "content",
      enabled: true,
      mode,
      skipped,
      summary: `ContentAgent ${mode}: ${state.contentDrafts.filter((d) => d.status === "draft").length} draft post ideas.${extra}`,
      draftsCreated,
    },
  };
}
