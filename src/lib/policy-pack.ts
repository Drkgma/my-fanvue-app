export type Confidence = "high" | "medium" | "low";

export type HardStopConsequence =
  | "account_ban"
  | "content_removal"
  | "legal_referral";

export type Source = {
  id: string;
  title: string;
  url: string;
  publisher: string;
  last_updated: string;
  retrieved: string;
};

export type HardStop = {
  id: string;
  rule: string;
  detection_signals: string[];
  consequence: HardStopConsequence;
  source_ids: string[];
};

export type PolicyCategory = {
  id: string;
  name: string;
  what_the_policy_says: string;
  removal_triggers: string[];
  downrank_triggers: string[];
  clearly_allowed: string[];
  grey_zone: string[];
  confidence: Confidence;
  source_ids: string[];
};

export type PolicyPack = {
  policy_version: string;
  sources: Source[];
  hard_stops: HardStop[];
  categories: PolicyCategory[];
  caption_rules: {
    prohibited: string[];
    risky: string[];
    off_platform_links: string;
    source_ids: string[];
  };
  ai_disclosure: {
    requirement: string;
    applies_when: string;
    how_to_comply: string;
    penalty_for_omission: string;
    source_ids: string[];
  };
  reach_factors: {
    boosts: string[];
    suppressors: string[];
    source_ids: string[];
  };
  enforcement_observations: Array<{
    claim: string;
    confidence: Confidence;
    basis: string;
    source_ids: string[];
  }>;
  changed_recently: Array<{
    what: string;
    when: string;
    impact: string;
    source_ids: string[];
  }>;
  open_questions: string[];
};

export const REQUIRED_CATEGORY_IDS = [
  "adult_nudity",
  "sexual_solicitation",
  "suggestive_borderline",
  "minor_safety",
  "synthetic_media",
  "spam_inauthentic",
  "music_ip",
  "off_platform_promotion",
  "recommendation_eligibility",
] as const;

export function isPolicyPack(value: unknown): value is PolicyPack {
  if (!value || typeof value !== "object") return false;
  const pack = value as Partial<PolicyPack>;
  return (
    typeof pack.policy_version === "string" &&
    Array.isArray(pack.sources) &&
    Array.isArray(pack.hard_stops) &&
    Array.isArray(pack.categories) &&
    typeof pack.caption_rules === "object" &&
    typeof pack.ai_disclosure === "object" &&
    typeof pack.reach_factors === "object" &&
    Array.isArray(pack.enforcement_observations) &&
    Array.isArray(pack.changed_recently) &&
    Array.isArray(pack.open_questions)
  );
}

export function missingRequiredCategories(pack: PolicyPack): string[] {
  const ids = new Set(pack.categories.map((c) => c.id));
  return REQUIRED_CATEGORY_IDS.filter((id) => !ids.has(id));
}
