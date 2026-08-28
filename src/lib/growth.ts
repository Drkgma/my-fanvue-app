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
  { phase: 0, label: "Now", revenue: "$5/mo", subs: "1 → 10", focus: "Auth, 20 images, 5 teasers" },
  { phase: 1, label: "Month 1", revenue: "$500–$1,000", subs: "35–70", focus: "Daily posts, ChatMate, MoneyBot" },
  { phase: 2, label: "Month 3", revenue: "$3,000–$5,000", subs: "200–400", focus: "Daily PPV, Reddit + TikTok" },
  { phase: 3, label: "Month 6", revenue: "$8,000–$15,000", subs: "600–1,000", focus: "Tiered pricing, custom content" },
] as const;

export const TWENTY_FOUR_HOUR = [
  { id: "auth", title: "Fix auth", detail: "Login with Fanvue must return your user, then save tokens.json." },
  { id: "upload", title: "Upload 20 images", detail: "Drop files in fanvue-automation/content_bank/ and run ContentAgent." },
  { id: "teasers", title: "Post 5 teasers", detail: "Audience: followers-and-subscribers. Then share the public page." },
  { id: "chat", title: "ChatMate + MoneyBot", detail: "Phase 1 only. Do not turn these on until 10 subscribers." },
] as const;
