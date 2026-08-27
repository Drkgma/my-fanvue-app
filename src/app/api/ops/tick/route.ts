import { NextResponse } from "next/server";
import { getCurrentUser, getSessionTokens } from "@/lib/fanvue";
import { runTick } from "@/lib/ops/orchestrator";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authorized(request: Request, hasUser: boolean) {
  const cronSecret = process.env.CRON_SECRET?.trim();
  const header = request.headers.get("authorization") ?? "";
  const bearer = header.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : "";
  if (hasUser) return true;
  if (cronSecret && bearer && bearer === cronSecret) return true;
  if (process.env.NODE_ENV !== "production") return true;
  return false;
}

async function handle(request: Request) {
  const user = await getCurrentUser();
  if (!authorized(request, Boolean(user))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const session = await getSessionTokens();
  const body = await request.json().catch(() => ({} as { requestText?: string }));
  const { report } = await runTick({
    user,
    session,
    requestText: typeof body.requestText === "string" ? body.requestText : undefined,
  });
  return NextResponse.json(report);
}

export async function POST(request: Request) {
  return handle(request);
}

export async function GET(request: Request) {
  return handle(request);
}
