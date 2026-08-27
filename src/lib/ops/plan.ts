import type { DailyMoneyPlan, DailyPlanItem, FanvueMe, OpsState, Phase } from "./types";

function isoDate(now: Date) {
  return now.toISOString().slice(0, 10);
}

/** Monday=1 … Sunday=7, matching the 7-day content plan. */
export function planDayNumber(now: Date): number {
  const utc = now.getUTCDay();
  return utc === 0 ? 7 : utc;
}

export function pickTodayContent(state: OpsState, now: Date) {
  const posts = state.contentDrafts.filter((d) => d.status !== "dismissed" && d.placement !== "ppv");
  const day = planDayNumber(now);
  return posts.find((d) => d.day === day) ?? posts.find((d) => d.status === "draft") ?? posts[0] ?? null;
}

export function buildTodayPlan(input: {
  state: OpsState;
  phase: Phase;
  subscriberCount: number;
  waitingForLogin: boolean;
  user: FanvueMe | null;
  now: Date;
}): DailyMoneyPlan {
  const date = isoDate(input.now);
  const mode = input.waitingForLogin ? "demo" : "live";
  const today = pickTodayContent(input.state, input.now);
  const sub = input.state.moneySuggestions.find((s) => s.kind === "subscription");
  const ppv = input.state.moneySuggestions.find((s) => s.kind === "ppv");
  const tip = input.state.moneySuggestions.find((s) => s.kind === "tip");
  const welcome = input.state.chatDrafts.find((d) => d.kind === "welcome");
  const looker = input.state.chatDrafts.find((d) => d.kind === "looker");
  const traffic = input.state.trafficReminders.find((r) => r.status === "open");

  const items: DailyPlanItem[] = [];
  let step = 1;

  if (input.waitingForLogin) {
    items.push({
      id: "plan-login",
      step: step++,
      title: "Unblock Fanvue login (you, not the app)",
      detail:
        "Register http://localhost:3000/api/oauth/callback at fanvue.com/developers, then click Login with Fanvue. Until that matches, this dashboard stays in demo mode: drafts save locally and nothing is sent.",
      owner: "you",
      status: "blocked",
    });
  } else {
    items.push({
      id: "plan-login",
      step: step++,
      title: "Fanvue session is live",
      detail:
        "Read APIs can run with the scopes you granted. Phase 0/1 still will not auto-publish or auto-DM — copy drafts into Fanvue yourself.",
      owner: "you",
      status: "ready",
    });
  }

  items.push({
    id: "plan-post",
    step: step++,
    title: today
      ? `Post today’s Fanvue item: Day ${today.day} — ${today.title}`
      : "Post one Fanvue item today",
    detail: today
      ? `${today.placement === "sfw-teaser" ? "SFW teaser (existing channel only). " : ""}${today.caption}`
      : "Run a tick to seed the 7-day plan, then copy one caption into Fanvue.",
    owner: "content",
    status: today ? (today.status === "ready" || today.status === "queued" ? "ready" : "do_today") : "waiting",
    copyText: today?.caption,
  });

  const ladderBits = [
    sub ? `sub $${sub.priceUsd}/mo + 14-day trial` : "sub ~$6.99 + 14-day trial",
    ppv ? `first PPV $${ppv.priceUsd}` : "first PPV $9",
    tip ? `tip menu from $${tip.priceUsd}` : "tip menu from $5",
  ].join("; ");
  items.push({
    id: "plan-offers",
    step: step++,
    title: "Set the beginner offer ladder (once)",
    detail: `On your Fanvue page: ${ladderBits}. Do not price like a celebrity page. You send PPV/tips by hand only to people already in chat.`,
    owner: "money",
    status: sub && ppv && tip ? "do_today" : "waiting",
  });

  items.push({
    id: "plan-chat",
    step: step++,
    title: "Be ready for one real conversation",
    detail: input.waitingForLogin
      ? `If someone subscribes, paste the welcome. If they follow but don’t sub, paste the unpaid-looker note — one person, not a blast. 24-hour rule: no overlapping outbound campaigns.`
      : `Welcome new subs one-to-one. Unpaid lookers get one invitational note, not a funnel blast. Auto-send stays off in Phase 0/1.`,
    owner: "chatmate",
    status: welcome && looker ? "do_today" : "waiting",
    copyText: welcome?.body,
  });

  items.push({
    id: "plan-traffic",
    step: step++,
    title: traffic ? traffic.title : "One compliant promo action",
    detail: traffic
      ? traffic.detail
      : "Finish the Fanvue bio first. If you already have Instagram/X, one SFW teaser this week with link in bio. No bots, no comment spam.",
    owner: "traffic",
    status: traffic ? "do_today" : "waiting",
  });

  items.push({
    id: "plan-expect",
    step: step++,
    title: "Keep the target honest",
    detail: `This account is Phase ${input.phase} (~${input.subscriberCount} subscriber${input.subscriberCount === 1 ? "" : "s"}). Winning this week is: one post, the ladder live, and a reply ready. Typical 90-day envelope from here is hundreds to low thousands — not $1M.`,
    owner: "analytics",
    status: "do_today",
  });

  return {
    date,
    phase: input.phase,
    mode,
    headline: input.waitingForLogin
      ? "Today’s money plan (demo) — drafts are ready; Fanvue send waits on login"
      : "Today’s money plan — copy drafts into Fanvue; live send stays off in Phase 0/1",
    why: "Phase 0/1 money is first paying fans, first PPV/tips, consistent posting, and chat conversion. Not a content factory.",
    expectedThisWeek:
      "A finished page, 7 days of posts queued as drafts, a $6.99 sub + trial, a $9 first PPV, and a welcome you can paste. If a fan pays this week, that’s the win.",
    items,
  };
}
