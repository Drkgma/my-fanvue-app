const fs = require("fs");
const path = require("path");
const pack = JSON.parse(
  fs.readFileSync(path.join(__dirname, "../src/data/policy-pack.json"), "utf8")
);

const required = [
  "adult_nudity",
  "sexual_solicitation",
  "suggestive_borderline",
  "minor_safety",
  "synthetic_media",
  "spam_inauthentic",
  "music_ip",
  "off_platform_promotion",
  "recommendation_eligibility",
];

for (const field of [
  "policy_version",
  "sources",
  "hard_stops",
  "categories",
  "caption_rules",
  "ai_disclosure",
  "reach_factors",
  "enforcement_observations",
  "changed_recently",
  "open_questions",
]) {
  if (pack[field] == null) throw new Error(`Missing ${field}`);
}

const ids = new Set(pack.categories.map((c) => c.id));
const missing = required.filter((id) => !ids.has(id));
if (missing.length) throw new Error(`Missing categories: ${missing.join(", ")}`);

const urls = pack.sources.map((s) => s.url);
const fake = urls.filter(
  (url) =>
    !/^https:\/\/(transparency\.meta\.com|help\.instagram\.com|www\.facebook\.com|creators\.instagram\.com|about\.instagram\.com|about\.fb\.com|www\.themirror\.com)\b/.test(
      url
    )
);
if (fake.length) throw new Error(`Unexpected source hosts: ${fake.join(", ")}`);

if (pack.sources.length < 12) throw new Error("Expected a full primary-source set");
if (pack.open_questions.length < 5) throw new Error("Open questions should be the next reading list");

console.log(
  `policy pack ${pack.policy_version}: ${pack.sources.length} sources, ${pack.categories.length} categories, ${pack.hard_stops.length} hard stops`
);
