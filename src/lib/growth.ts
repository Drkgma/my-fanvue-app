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
  { phase: 0, label: "Now", revenue: "$5/mo", subs: "1 → 10", focus: "SFW teasers + share the 7-day trial" },
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
    detail:
      "Text the 7-day free trial (10 uses) to 10 people you already talk to. Film a 15–30s clothed intro video in Fanvue Settings (Discover placement). Reddit, X, TikTok, and ads wait until 10 subscribers.",
  },
  {
    id: "offsite",
    title: "Reddit / X / TikTok later",
    detail:
      "Phase 2. Same SFW niche teasers. Never leak sites, never other people's photos or videos.",
  },
] as const;

export const PUBLIC_PAGE = "https://www.fanvue.com/funny-kite-83";
export const SHARE_CAPTION = "hi, it's me — more on the page if you want it";

export const SHARE_STEPS = [
  {
    id: "text-10",
    title: "Text 10 people you already talk to",
    detail:
      "Send the 7-day free trial from this desk. Friends, not strangers. Fanvue will not recommend a page with 0 followers.",
  },
  {
    id: "bio",
    title: "Put the link in your own bio",
    detail: "Instagram, Snapchat, WhatsApp, or iMessage — your accounts. One paste. No nudes off-platform.",
  },
  {
    id: "intro",
    title: "Film a 15–30s clothed intro video",
    detail:
      "Fanvue Discover guarantees intro-video placement. Phone selfie, clothes on, say hi and point at subscribe. No nudes in the intro.",
  },
  {
    id: "no-ads",
    title: "Do not buy ads yet",
    detail: "TrafficAgent, Reddit, X, TikTok, and Meta ads stay off until 10 subscribers.",
  },
] as const;

export const TWENTY_FOUR_HOUR = [
  { id: "auth", title: "Fix auth", detail: "Login with Fanvue must return your user, then save tokens.json." },
  { id: "upload", title: "Upload 20 images", detail: "Drop files in fanvue-automation/content_bank/ and run ContentAgent." },
  { id: "teasers", title: "Post teasers", detail: "Audience: followers-and-subscribers. Bank is posted. Next is sharing." },
  { id: "intro", title: "Intro video", detail: "15–30s clothed clip in Fanvue Settings → Profile. Discover uses this." },
] as const;
