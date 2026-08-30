import type { PolicyPack } from "@/lib/policy-pack";

export type Verdict = "REMOVAL" | "DOWNRANK" | "CLEAR";

export type ReelDraft = {
  outfit: "street" | "athleisure" | "swimwear" | "lingerie" | "see_through" | "partial_undress" | "unknown";
  framing: "face_or_full_scene" | "full_body" | "chest_focus" | "buttocks_closeup" | "crotch_focus";
  motion: "talking" | "walking" | "dancing" | "posing" | "sexual_simulation";
  caption: string;
  hasOffPlatformAdultLink: boolean;
  hasPornSiteLink: boolean;
  isAiGenerated: boolean;
  aiDisclosed: boolean;
  hasWatermark: boolean;
  isRepost: boolean;
  durationSeconds: number;
  audio: "in_app_personal" | "sound_collection" | "original" | "unknown_commercial";
  isBranded: boolean;
  brandedLabeled: boolean;
  isPublicProfessional: boolean;
};

export type Finding = {
  tier: Verdict;
  title: string;
  detail: string;
  source_ids: string[];
  category_id?: string;
};

export type ClearanceResult = {
  verdict: Verdict;
  summary: string;
  findings: Finding[];
};

const SOLICITATION =
  /\b(nudes?|sex tape|sex tape|onlyfans|fanvue|subscribe for spicy|link in bio for nudes|escort|sex chat|custom dick|send nudes|dropbox of nudes)\b/i;
const GRAPHIC_SEX =
  /\b(wetness|erection|blowjob|handjob|creampie|pussy|cock|anal|masturbat)/i;
const ENGAGEMENT_BAIT =
  /\b(like if you|comment yes if|double tap if|like to unlock|share to see)\b/i;

function worst(a: Verdict, b: Verdict): Verdict {
  const rank = { REMOVAL: 2, DOWNRANK: 1, CLEAR: 0 };
  return rank[a] >= rank[b] ? a : b;
}

export function evaluateReel(draft: ReelDraft, pack: PolicyPack): ClearanceResult {
  const findings: Finding[] = [];

  const add = (finding: Finding) => {
    findings.push(finding);
  };

  if (draft.framing === "crotch_focus" || draft.motion === "sexual_simulation") {
    add({
      tier: "REMOVAL",
      title: "Sexual activity / genital focus",
      detail:
        "Crotch-as-focus imagery and simulated sexual activity sit on the Adult Nudity removal or 18+ lines. Treat as removal-risk until a human reviewer confirms the milder 18+ bucket.",
      source_ids: ["S2"],
      category_id: "adult_nudity",
    });
  }

  if (draft.outfit === "see_through" || draft.outfit === "partial_undress") {
    add({
      tier: "DOWNRANK",
      title: "See-through or near-nudity",
      detail:
        "See-through clothing is Instagram's named example of sexually suggestive content that is recommendation-ineligible. Near-nudity is also 18+ under Adult Nudity. If nipples, genitals, anus, or a close-up of visible buttocks are actually shown, this upgrades to removal.",
      source_ids: ["S2", "S8"],
      category_id: "suggestive_borderline",
    });
  }

  if (draft.outfit === "lingerie") {
    add({
      tier: "DOWNRANK",
      title: "Lingerie / revealing clothing (undefined threshold)",
      detail:
        "Meta never names 'lingerie'. The April 2024 creator blog adds 'revealing clothing' next to see-through as recommendation-ineligible. Monetization separately restricts 'revealing or absent items of clothing'. Treat as downrank, not a documented removal.",
      source_ids: ["S10", "S17"],
      category_id: "suggestive_borderline",
    });
  }

  if (draft.framing === "buttocks_closeup" || draft.framing === "chest_focus") {
    add({
      tier: "DOWNRANK",
      title: "Sexualized body-part focus",
      detail:
        "A photo zoomed in on someone's buttocks is named as content hidden from teens. Imagery where crotch, buttocks, or female breast(s) are the focus is limited to 18+. Close-ups of visible (unclothed) buttocks are a removal line.",
      source_ids: ["S2", "S8", "S16"],
      category_id: "suggestive_borderline",
    });
  }

  if (draft.hasPornSiteLink || GRAPHIC_SEX.test(draft.caption) || SOLICITATION.test(draft.caption)) {
    add({
      tier: "REMOVAL",
      title: "Solicitation or explicit language in caption",
      detail:
        "Asking/offering pornographic material, porn-site usernames/links, paid sexual encounters, or graphic arousal/genital language is a Community Standards removal — not a shadowban.",
      source_ids: ["S3"],
      category_id: "sexual_solicitation",
    });
  }

  if (draft.hasOffPlatformAdultLink) {
    add({
      tier: "DOWNRANK",
      title: "Adult subscription link / logo / username",
      detail:
        pack.caption_rules.off_platform_links,
      source_ids: pack.caption_rules.source_ids,
      category_id: "off_platform_promotion",
    });
  }

  if (ENGAGEMENT_BAIT.test(draft.caption)) {
    add({
      tier: "DOWNRANK",
      title: "Engagement bait",
      detail:
        "Clickbait and engagement bait are recommendation-ineligible. Like/share-gating exclusive content is a Spam removal.",
      source_ids: ["S6", "S10"],
      category_id: "spam_inauthentic",
    });
  }

  if (draft.isAiGenerated && !draft.aiDisclosed) {
    add({
      tier: "DOWNRANK",
      title: "Missing AI disclosure on synthetic media",
      detail: pack.ai_disclosure.penalty_for_omission,
      source_ids: pack.ai_disclosure.source_ids,
      category_id: "synthetic_media",
    });
  }

  if (draft.hasWatermark) {
    add({
      tier: "DOWNRANK",
      title: "Visible watermark",
      detail:
        "Eligible recommended Reels have 'no visible watermarks'. Instagram also makes low-resolution or watermarked Reels less visible and has tested watermark-specific reach notifications.",
      source_ids: ["S9", "S10", "S23"],
      category_id: "recommendation_eligibility",
    });
  }

  if (draft.isRepost) {
    add({
      tier: "DOWNRANK",
      title: "Unoriginal / recycled upload",
      detail:
        "Unoriginal content with only minor edits is recommendation-ineligible. Identical copies are replaced by the original. Accounts that primarily repost can lose account-level recommendations.",
      source_ids: ["S10", "S22"],
      category_id: "recommendation_eligibility",
    });
  }

  if (draft.durationSeconds > 180) {
    add({
      tier: "DOWNRANK",
      title: "Over 3 minutes",
      detail: "To be recommended, content has to be 3 minutes or less.",
      source_ids: ["S9"],
      category_id: "recommendation_eligibility",
    });
  }

  if (!draft.isPublicProfessional) {
    add({
      tier: "DOWNRANK",
      title: "Account not eligible to be recommended",
      detail: "Instagram only recommends content from public accounts. Creator and Business accounts are public by default.",
      source_ids: ["S9"],
      category_id: "recommendation_eligibility",
    });
  }

  if (draft.audio === "unknown_commercial" && draft.isBranded) {
    add({
      tier: "DOWNRANK",
      title: "Chart music on a commercial post",
      detail:
        "The licensed in-app library is for personal, non-commercial use. Sound Collection is the named commercial-safe library. Whether a paid partnership using a chart track is muted or removed is not fully specified.",
      source_ids: ["S19"],
      category_id: "music_ip",
    });
  }

  if (draft.isBranded && !draft.brandedLabeled) {
    add({
      tier: "REMOVAL",
      title: "Undisclosed branded content",
      detail:
        "Branded content must use the paid partnership label whenever there is an exchange of value. Affiliate links need the label even without a partner tag. Restricted-category branded content without age gates is removed.",
      source_ids: ["S20", "S30"],
      category_id: "branded_content",
    });
  }

  const verdict: Verdict = findings.reduce<Verdict>(
    (current, finding) => worst(current, finding.tier),
    "CLEAR"
  );

  const summary =
    verdict === "REMOVAL"
      ? "Do not post as drafted. One or more Community Standards removal lines are in play."
      : verdict === "DOWNRANK"
        ? "Likely stays up for followers but is recommendation-ineligible or age-gated. This is the documented downrank tier creators call a shadowban."
        : "No retrieved removal or named recommendation-ineligible signal fired. Meta is still vague on suggestive thresholds — re-check Account Status after posting.";

  return { verdict, summary, findings };
}

export function emptyDraft(): ReelDraft {
  return {
    outfit: "street",
    framing: "full_body",
    motion: "talking",
    caption: "",
    hasOffPlatformAdultLink: false,
    hasPornSiteLink: false,
    isAiGenerated: false,
    aiDisclosed: false,
    hasWatermark: false,
    isRepost: false,
    durationSeconds: 15,
    audio: "sound_collection",
    isBranded: false,
    brandedLabeled: false,
    isPublicProfessional: true,
  };
}
