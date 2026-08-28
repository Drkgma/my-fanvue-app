export const FANVUE_API_VERSION = "2025-06-26";

export const PHASE0_SCOPES = [
  "read:self",
  "read:chat",
  "write:chat",
  "read:post",
  "write:post",
  "read:media",
  "write:media",
  "read:creator",
  "write:creator",
] as const;

export const GROWTH_LADDER = [
  { phase: 0, label: "Now", revenue: "$5/mo", subs: "1 → 10", focus: "SFW teasers + share the page" },
  { phase: 1, label: "Month 1", revenue: "$500–$1,000", subs: "35–70", focus: "Daily posts, ChatMate, PPV menu" },
  { phase: 2, label: "Month 3", revenue: "$3,000–$5,000", subs: "200–400", focus: "SFW Reddit/TikTok teasers only" },
  { phase: 3, label: "Month 6", revenue: "$8,000–$15,000", subs: "600–1,000", focus: "Tiered pricing, custom content" },
] as const;

export const PLATFORM_RULES = [
  {
    id: "public",
    title: "Public / main feed",
    detail:
      "Girl-next-door SFW only. Nudes on the free feed kill PPV unlocks. Ask what they want next.",
  },
  {
    id: "ppv",
    title: "PPV / scripts",
    detail:
      "Paid packs: $9 (2–4 pics + sexy video, Instagram-sexy), $23 lingerie, $35 lingerie + half nudes, $75 only nudes. Film packs 2–4 yourself. Chatters stay off until 10 subs.",
  },
  {
    id: "share",
    title: "Right now (0 followers)",
    detail: "Share https://www.fanvue.com/funny-kite-83. Reddit, X, and TikTok wait until 10 subscribers.",
  },
  {
    id: "offsite",
    title: "Reddit / X / TikTok later",
    detail:
      "Phase 2. Same SFW niche teasers. Never leak sites, never other people's photos or videos.",
  },
] as const;

export const TWENTY_FOUR_HOUR = [
  { id: "auth", title: "Fix auth", detail: "Login with Fanvue must return your user, then save tokens.json." },
  { id: "upload", title: "Upload 20 images", detail: "Drop files in fanvue-automation/content_bank/ and run ContentAgent." },
  { id: "teasers", title: "Post 5 teasers", detail: "Audience: followers-and-subscribers. Then share the public page." },
  { id: "chat", title: "ChatMate + MoneyBot", detail: "Phase 1 only. Do not turn these on until 10 subscribers." },
] as const;
