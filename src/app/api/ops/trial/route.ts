import { NextResponse } from "next/server";
import { asArray, fanvueFetch, getAccessToken } from "@/lib/fanvue";

export const dynamic = "force-dynamic";

const TRIAL_MESSAGE = "Welcome — 14 days on me. Come say hi.";

export async function POST() {
  if (!(await getAccessToken())) {
    return NextResponse.json({ error: "Not signed in to Fanvue" }, { status: 401 });
  }

  const existing = await fanvueFetch("/promotions");
  if (existing.ok) {
    const already = asArray(existing.data).find(
      (promo) => promo.type === "free_trial" && promo.freeTrialDays === 14 && promo.availableToGroup === "new_subscribers",
    );
    if (already) {
      return NextResponse.json({ skipped: true, reason: "A 14-day new-subscriber trial already exists.", promotion: already });
    }
  }

  const result = await fanvueFetch("/promotions", {
    method: "POST",
    body: JSON.stringify({
      freeTrial: true,
      freeTrialDays: 14,
      availableToGroup: "new_subscribers",
      message: TRIAL_MESSAGE,
    }),
  });

  if (!result.ok) {
    return NextResponse.json({ error: "Could not create the 14-day trial", detail: result.data }, { status: result.status });
  }

  return NextResponse.json({ skipped: false, promotion: result.data });
}
