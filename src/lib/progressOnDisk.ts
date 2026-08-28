import { existsSync, readFileSync } from "fs";
import { join } from "path";

export type ProgressSnapshot = {
  at?: string;
  handle?: string;
  public_url?: string;
  subscribers?: number;
  followers?: number;
  earnings_cents?: number;
  posts_listed?: number;
  teasers_posted?: number;
  leftover_teasers?: number;
  bank?: number;
  ppv_ready?: number;
  ppv_total?: number;
  ppv_posted?: number;
  ppv_missing?: string[];
  next_milestone?: number;
  share_note?: string;
};

const progressPath = () => join(process.cwd(), "fanvue-automation", "progress.json");

/** Last AnalyticsAgent snapshot. Counts only — never tokens. */
export function readProgress(): ProgressSnapshot | null {
  const dest = progressPath();
  try {
    if (!existsSync(dest)) return null;
    const parsed = JSON.parse(readFileSync(dest, "utf8")) as ProgressSnapshot;
    if (!parsed || typeof parsed !== "object") return null;
    return parsed;
  } catch {
    return null;
  }
}
