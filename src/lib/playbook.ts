export const API_VERSION = "2025-06-26";

export const SOP_LISTS = [
  { name: "NEW SUBSCRIBERS ($0 - $49)", key: "new" as const },
  { name: "RELATIONSHIP BUILDERS ($50 - $499)", key: "builders" as const },
  { name: "BIG SPENDER ($500 AND UP)", key: "whales" as const },
  { name: "TIME WASTERS", key: "time_wasters" as const },
  { name: "USA AND CANADA", key: "na" as const },
  { name: "EUROPE", key: "eu" as const },
  { name: "REST OF THE WORLD", key: "row" as const },
  { name: "INNER CIRCLE", key: "inner" as const },
  { name: "BF", key: "bf" as const },
];

export const SOP_VAULT_FOLDERS = [
  "SFW",
  "Selfies",
  "Bundle 1 - White Pyjama",
  "Bundle 2 - Pink Lingerie",
  "Solo",
  "Sextapes",
  "Voice notes - check-ins",
  "Voice notes - flirty",
  "Voice notes - re-engage",
];

export type SpendBucket = "new" | "builders" | "whales";

export function spendBucket(grossCents: number): SpendBucket {
  if (grossCents >= 50_000) return "whales";
  if (grossCents >= 5_000) return "builders";
  return "new";
}

export const OPERATOR_SCOPES =
  "read:self read:fan read:creator write:creator read:media write:media read:chat write:chat read:insights read:post write:post";
