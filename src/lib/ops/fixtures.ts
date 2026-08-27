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
  ];

  return days.map((d) => ({
    ...d,
    id: `content-day-${d.day}`,
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
      title: "Soft invite",
      body: "If you want the set I mentioned, it’s in the wall. No rush — I’ll still answer either way.",
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

export function seedMoneyMenu(nowIso: string): MoneySuggestion[] {
  return [
    {
      id: "ppv-photos",
      name: "Photo set",
      priceUsd: 9,
      note: "Phase 1 menu: a small named set you can actually deliver today.",
      createdAt: nowIso,
    },
    {
      id: "ppv-video",
      name: "Short video",
      priceUsd: 19,
      note: "One clip, honest length. Do not price like a celebrity page.",
      createdAt: nowIso,
    },
    {
      id: "ppv-bundle",
      name: "Bundle (set + clip)",
      priceUsd: 29,
      note: "Only offer this if both pieces already exist in your vault.",
      createdAt: nowIso,
    },
  ];
}

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
      id: "traffic-no-spam",
      title: "Do not mass-DM anyone",
      detail: "No unsolicited PPV to non-chatters. No Telegram blast lists. TrafficAgent only reminds; it never sends.",
      compliant: true,
      status: "open",
      createdAt: nowIso,
    },
  ];
}
