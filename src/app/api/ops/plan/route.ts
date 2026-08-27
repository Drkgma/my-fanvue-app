import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/fanvue";
import { detectPhase } from "@/lib/ops/phase";
import { buildTodayPlan } from "@/lib/ops/plan";
import { loadState } from "@/lib/ops/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  const state = await loadState();
  const detected = detectPhase(user);
  const todayPlan =
    state.todayPlan ??
    buildTodayPlan({
      state,
      phase: detected.phase,
      subscriberCount: detected.subscriberCount,
      waitingForLogin: !user,
      user,
      now: new Date(),
    });
  return NextResponse.json({
    waitingForLogin: !user,
    phase: detected,
    todayPlan,
  });
}
