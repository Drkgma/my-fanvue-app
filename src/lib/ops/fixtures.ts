import type { ChatDraft, ContentDraft, MoneySuggestion, TrafficReminder } from "./types";

export function seedContentPlan(nowIso: string): ContentDraft[] {
  const days: Array<Omit<ContentDraft, "id" | "createdAt" | "status">> = [
    {
      day: 1,
      title: "Who I am + what you get",
      caption:
        "New here. This page is for people who want to follow along — behind-the-scenes, regular posts, and DMs that actually get answered. Start with the trial if it’s open.",
      placement: "fanvue-only",
    },
    {
      day: 2,
      title: "SFW teaser (only if you already have a channel)",
      caption:
        "Quiet photo, no pitch spam. Caption: “new page, link in bio.” Keep it recommendation-safe if the channel is Instagram.",
      placement: "sfw-teaser",
    },
    {
      day: 3,
      title: "A normal day clip or still",
      caption: "One honest post. No countdown-to-million energy. Invite questions in DMs.",
      placement: "fanvue-only",
    },
    {
      day: 4,
      title: "Set / mini-collection",
      caption: "3–6 photos as one post. Tell them what tomorrow is so they have a reason to open the page again.",
      placement: "fanvue-only",
    },
    {
      day: 5,
      title: "Reply-bait question",
      caption: "Ask one simple question fans can answer in one line. Use the ChatMate welcome if someone new subs.",
      placement: "fanvue-only",
    },
    {
      day: 6,
      title: "Voice note or talking head (optional)",
      caption: "If you don’t want to film, post a still and a longer caption. Consistency beats a content factory.",
      placement: "fanvue-only",
    },
    {
      day: 7,
      title: "Weekly recap + next week tease",
      caption:
        "What you posted, that DMs are open, and one thing coming next week. If the trial is on, mention it once — not in every sentence.",
      placement: "fanvue-only",
    },
    {
      day: 0,
      title: "PPV concept: first photo set ($9)",
      caption:
        "The set I mentioned — six photos. Unlock when you want it. No countdown, no pressure.",
      placement: "ppv",
    },
    {
      day: 0,
      title: "PPV concept: short clip if you already filmed one ($12)",
      caption:
        "One short clip from this week. Honest length. Only send this in a chat that’s already going — never as a blast.",
      placement: "ppv",
    },
  ];

  return days.map((d, i) => ({
    ...d,
    id: d.placement === "ppv" ? `content-ppv-${i}` : `content-day-${d.day}`,
    status: "draft",
    createdAt: nowIso,
  }));
}

export function seedChatTemplates(nowIso: string): ChatDraft[] {
  const rows: Array<Omit<ChatDraft, "id" | "createdAt" | "status">> = [
    {
      kind: "welcome",
      title: "New subscriber welcome",
      body: "Hey — thanks for being here. I’m actually around, so say hi and tell me how you found the page.",
    },
    {
      kind: "looker",
      title: "Unpaid looker (followed / peeked, not subscribed)",
      body: "Hey — saw you drop by. Trial’s open if you want to hang out inside. No pressure either way; I’ll still post.",
    },
    {
      kind: "check-in",
      title: "Quiet fan check-in",
      body: "You’ve been here a bit — anything you want to see more of this week?",
    },
    {
      kind: "witty",
      title: "Light reply",
      body: "That’s a first. Tell me more — I’m listening.",
    },
    {
      kind: "invitational",
      title: "Soft invite (only after they already chatted)",
      body: "If you want the set I mentioned, it’s $9 in the wall. No rush — I’ll still answer either way.",
    },
    {
      kind: "re-engage",
      title: "Been a while",
      body: "Hey, missed you in here. I posted a few things since you last dropped in whenever you want to look.",
    },
  ];
  return rows.map((r, i) => ({
    ...r,
    id: `chat-tpl-${i + 1}`,
    status: "draft",
    createdAt: nowIso,
  }));
}

/** Beginner ladder: sub + first PPV + tip menu. Not celebrity pricing. */
export function seedMoneyMenu(nowIso: string): MoneySuggestion[] {
  return [
    {
      id: "sub-monthly",
      kind: "subscription",
      name: "Monthly sub + 14-day trial",
      priceUsd: 6.99,
      note: "Phase 0/1 default: cheap enough that a curious fan tries it. Leave the 14-day trial on unless you already convert without it.",
      createdAt: nowIso,
    },
    {
      id: "tip-hi",
      kind: "tip",
      name: "Tip menu: say hi",
      priceUsd: 5,
      note: "Low-friction tip. Mention it in chat only after they message you — never as a wall blast.",
      createdAt: nowIso,
    },
    {
      id: "ppv-first",
      kind: "ppv",
      name: "First PPV: 6-photo set",
      priceUsd: 9,
      note: "One named set you can deliver today. Send only in an existing conversation.",
      createdAt: nowIso,
    },
    {
      id: "tip-pick",
      kind: "tip",
      name: "Tip menu: pick next post",
      priceUsd: 15,
      note: "Optional second tip. Skip it if you don’t want custom requests yet.",
      createdAt: nowIso,
    },
  ];
}

export const MONEY_LADDER_IDS = ["sub-monthly", "tip-hi", "ppv-first", "tip-pick"] as const;

export function seedTrafficChecklist(nowIso: string): TrafficReminder[] {
  return [
    {
      id: "traffic-bio",
      title: "Finish the Fanvue page first",
      detail:
        "One-line voice + one-line “what they get.” Default promo: 14-day trial for new subs unless you already convert without it.",
      compliant: true,
      status: "open",
      createdAt: nowIso,
    },
    {
      id: "traffic-one-channel",
      title: "One existing channel, weekly (Phase 1)",
      detail:
        "If you already have Instagram/X/etc., post one SFW teaser a week with link in bio. No hashtag stuffing, no comment spam, no scraping, no bought engagement.",
      compliant: true,
      status: "open",
      createdAt: nowIso,
    },
    {
      id: "traffic-where-to-post",
      title: "Where to post / what to say",
      detail:
        "Fanvue wall: daily. Existing SFW social: one teaser, “new page — link in bio,” no price list in the caption. Reddit/forums: only if the community allows creator links; read the rules first. Nowhere: bots, mass DMs, comment spam.",
      compliant: true,
      status: "open",
      createdAt: nowIso,
    },
    {
      id: "traffic-no-spam",
      title: "Do not mass-DM anyone",
      detail: "No unsolicited PPV to non-chatters. No Telegram blast lists. TrafficAgent only reminds; it never sends.",
      compliant: true,
      status: "open",
      createdAt: nowIso,
    },
  ];
}
