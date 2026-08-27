import { NextResponse } from "next/server";
import { getCurrentUser, getSessionTokens } from "@/lib/fanvue";
import { buildOpsStatus } from "@/lib/ops/status";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  const session = await getSessionTokens();
  const status = await buildOpsStatus({ user, session });
  return NextResponse.json(status);
}
