#!/usr/bin/env node
/**
 * Run one daily creator-ops cycle against the local Next server.
 * Requires `pnpm dev` (or `pnpm start`) so POST /api/ops/tick is reachable.
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

function parseEnv(text) {
  const out = {};
  for (const line of text.split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#") || !t.includes("=")) continue;
    const i = t.indexOf("=");
    out[t.slice(0, i)] = t.slice(i + 1).trim().replace(/^["']|["']$/g, "");
  }
  return out;
}

const file = resolve(process.cwd(), ".env.local");
const kv = existsSync(file) ? parseEnv(readFileSync(file, "utf8")) : {};
const base = (process.env.BASE_URL || kv.BASE_URL || "http://localhost:3456").replace(/\/$/, "");
const cron = process.env.CRON_SECRET || kv.CRON_SECRET || "";

const headers = { "content-type": "application/json" };
if (cron) headers.authorization = `Bearer ${cron}`;

let res;
try {
  res = await fetch(`${base}/api/ops/tick`, {
    method: "POST",
    headers,
    body: JSON.stringify({}),
  });
} catch (err) {
  console.error(`Could not reach ${base}/api/ops/tick`);
  console.error(err instanceof Error ? err.message : err);
  console.error("Start the app first: pnpm dev");
  process.exit(1);
}

const text = await res.text();
let json;
try {
  json = JSON.parse(text);
} catch {
  console.error(`Tick returned non-JSON (${res.status}): ${text.slice(0, 400)}`);
  process.exit(1);
}

if (!res.ok) {
  console.error(`Tick failed (${res.status})`);
  console.error(JSON.stringify(json, null, 2));
  process.exit(1);
}

const plan = json.todayPlan;
console.log(`phase: ${json.phase?.phase} ${json.phase?.label ?? ""}`.trim());
console.log(`mode: ${json.waitingForLogin ? "demo/offline (waiting_for_login)" : "live session"}`);
console.log(`at: ${json.at}`);
if (plan) {
  console.log("");
  console.log(plan.headline);
  console.log(plan.expectedThisWeek);
  for (const item of plan.items ?? []) {
    console.log(`  ${item.step}. [${item.status}] ${item.title}`);
  }
}
console.log("");
for (const r of json.results ?? []) {
  console.log(`- ${r.agent}: ${r.summary}`);
}
