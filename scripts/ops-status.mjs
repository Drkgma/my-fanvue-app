#!/usr/bin/env node
/**
 * Prints whether required env keys are present. Never prints values.
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const required = [
  "OAUTH_CLIENT_ID",
  "OAUTH_CLIENT_SECRET",
  "OAUTH_REDIRECT_URI",
  "OAUTH_SCOPES",
  "SESSION_SECRET",
  "BASE_URL",
  "API_BASE_URL",
];

function parseEnv(text) {
  const out = {};
  for (const line of text.split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#") || !t.includes("=")) continue;
    const i = t.indexOf("=");
    out[t.slice(0, i)] = t.slice(i + 1).trim();
  }
  return out;
}

const file = resolve(process.cwd(), ".env.local");
if (!existsSync(file)) {
  console.log("env_file: missing (.env.local)");
  process.exitCode = 1;
} else {
  console.log("env_file: present");
}
const kv = existsSync(file) ? parseEnv(readFileSync(file, "utf8")) : {};
let missing = 0;
for (const k of required) {
  const ok = Boolean(kv[k] && kv[k].replace(/^["']|["']$/g, ""));
  console.log(`${k}: ${ok ? "present" : "MISSING"}`);
  if (!ok) missing += 1;
}
console.log(`CRON_SECRET: ${kv.CRON_SECRET ? "present" : "optional/missing"}`);
console.log(`oauth_user_login: not checked here — open /ops or GET /api/ops/status`);
console.log(`redirect_uri_to_register: ${kv.OAUTH_REDIRECT_URI || "http://localhost:3456/callback"}`);
if (missing) process.exitCode = 1;
