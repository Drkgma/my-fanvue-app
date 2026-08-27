import { NextResponse } from "next/server";
import { getCurrentUser, getSessionTokens } from "@/lib/fanvue";
import { applyDraftAction, tryOutboundRefusal } from "@/lib/ops/orchestrator";
import { detectPhase } from "@/lib/ops/phase";
import { loadState, saveState } from "@/lib/ops/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ActionBody = {
  type?: string;
  collection?: "content" | "chat" | "traffic";
  id?: string;
  outbound?: "content.publish" | "chatmate.send" | "chatmate.mass_dm" | "money.broadcast" | "traffic.campaign";
};

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as ActionBody;
  const user = await getCurrentUser();
  const session = await getSessionTokens();
  const { phase } = detectPhase(user);

  if (body.outbound) {
    const agent =
      body.outbound.startsWith("content")
        ? "content"
        : body.outbound.startsWith("chatmate")
          ? "chatmate"
          : body.outbound.startsWith("money")
            ? "money"
            : "traffic";
    const decision = tryOutboundRefusal({
      agent,
      kind: body.outbound,
      user,
      session,
      phase,
    });
    if (!decision.ok) {
      return NextResponse.json(
        { ok: false, refused: true, code: decision.code, message: decision.message },
        { status: 403 },
      );
    }
    return NextResponse.json({ ok: false, refused: true, message: "No live outbound in this phase." }, { status: 403 });
  }

  if (!body.type || !body.collection || !body.id) {
    return NextResponse.json({ error: "type, collection, and id are required" }, { status: 400 });
  }
  if (body.type !== "dismiss" && body.type !== "ready") {
    return NextResponse.json({ error: "type must be dismiss or ready" }, { status: 400 });
  }

  const state = applyDraftAction(await loadState(), {
    type: body.type,
    collection: body.collection,
    id: body.id,
  });
  await saveState(state);
  return NextResponse.json({ ok: true, state });
}
