import { NextResponse } from "next/server";
import { loadState } from "@/lib/ops/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const state = await loadState();
  return NextResponse.json(state);
}
