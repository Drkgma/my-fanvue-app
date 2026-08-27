import { seedChatTemplates } from "@/lib/ops/fixtures";
import { listCreatorChats, type SessionTokens } from "@/lib/ops/fanvue-client";
import { agentModeForPhase } from "@/lib/ops/phase";
import type { AgentRunResult, FanvueMe, OpsState, Phase } from "@/lib/ops/types";

export async function runChatMate(input: {
  state: OpsState;
  phase: Phase;
  user: FanvueMe | null;
  session: SessionTokens | null;
  nowIso: string;
}): Promise<{ state: OpsState; result: AgentRunResult }> {
  const mode = agentModeForPhase("chatmate", input.phase);
  if (mode === "off") {
    return {
      state: input.state,
      result: {
        agent: "chatmate",
        enabled: false,
        mode,
        skipped: "phase_gated",
        summary: "ChatMate is off for this phase.",
        draftsCreated: 0,
      },
    };
  }

  let state = input.state;
  let draftsCreated = 0;
  let skipped: AgentRunResult["skipped"];
  let extra = " Auto-send is off. Mass DMs are refused.";

  const active = state.chatDrafts.filter((d) => d.status !== "dismissed");
  const hasLooker = active.some((d) => d.kind === "looker");
  if (active.length === 0 || !hasLooker) {
    const seeded = seedChatTemplates(input.nowIso);
    if (active.length === 0) {
      state = { ...state, chatDrafts: seeded };
      draftsCreated = seeded.length;
    } else {
      const add = seeded.filter((d) => d.kind === "looker");
      state = { ...state, chatDrafts: [...active, ...add] };
      draftsCreated = add.length;
    }
  }

  if (!input.user) {
    skipped = "waiting_for_login";
    extra = " Template queue is local until Fanvue login." + extra;
  } else if (input.user.uuid) {
    const chats = await listCreatorChats(input.session, input.user.uuid);
    if (chats.ok) {
      const unread = (chats.data.data ?? []).filter((c) => c.isRead === false).length;
      extra = ` GET /creators/{id}/chats returned ${chats.data.data?.length ?? 0} chat(s), ${unread} unread. Drafts only.` + extra;
    } else {
      skipped = chats.reason;
      extra = ` ${chats.message}` + extra;
    }
  }

  return {
    state,
    result: {
      agent: "chatmate",
      enabled: true,
      mode,
      skipped,
      summary: `ChatMate ${mode}: ${state.chatDrafts.filter((d) => d.status === "draft").length} draft replies.${extra}`,
      draftsCreated,
    },
  };
}
