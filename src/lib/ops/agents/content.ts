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

  const active = state.contentDrafts.filter((d) => d.status !== "dismissed");
  const hasPpv = active.some((d) => d.placement === "ppv");
  if (active.length === 0) {
    state = { ...state, contentDrafts: seedContentPlan(input.nowIso) };
    draftsCreated = state.contentDrafts.length;
  } else if (!hasPpv) {
    const add = seedContentPlan(input.nowIso).filter((d) => d.placement === "ppv");
    state = { ...state, contentDrafts: [...state.contentDrafts, ...add] };
    draftsCreated = add.length;
  }

  if (!input.user) {
    skipped = "waiting_for_login";
    extra = " 7-day plan + PPV concepts saved locally. Copy into Fanvue by hand until login.";
  } else {
    const posts = await listPosts(input.session);
    if (posts.ok) {
      extra = ` Live GET /posts returned ${posts.data.data?.length ?? 0} item(s). Ready drafts are a paste queue — no auto-publish in Phase 0/1.`;
    } else {
      skipped = posts.reason;
      extra = ` ${posts.message} Drafts remain a local paste queue.`;
    }
  }

  const draftCount = state.contentDrafts.filter((d) => d.status === "draft").length;
  const readyCount = state.contentDrafts.filter((d) => d.status === "ready" || d.status === "queued").length;

  return {
    state,
    result: {
      agent: "content",
      enabled: true,
      mode,
      skipped,
      summary: `ContentAgent ${mode}: ${draftCount} drafts, ${readyCount} queued to paste.${extra}`,
      draftsCreated,
    },
  };
}
