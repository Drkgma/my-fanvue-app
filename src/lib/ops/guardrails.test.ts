import assert from "node:assert/strict";
import { test } from "node:test";
import { evaluateGuardrail, looksLikeFantasyTarget } from "./guardrails.ts";

test("refuses $1M / get-rich-quick text", () => {
  assert.equal(looksLikeFantasyTarget("make $1M in 3 months"), true);
  assert.equal(looksLikeFantasyTarget("$1,000,000 million this quarter"), true);
  const d = evaluateGuardrail({
    kind: "fantasy.million",
    agent: "orchestrator",
    phase: 0,
    user: null,
    grantedScopes: [],
    text: "get me to a million dollars in three months",
  });
  assert.equal(d.ok, false);
  if (!d.ok) assert.equal(d.code, "refuse_million_fantasy");
});

test("refuses mass DM and posting without login", () => {
  const mass = evaluateGuardrail({
    kind: "chatmate.mass_dm",
    agent: "chatmate",
    phase: 1,
    user: { uuid: "x" },
    grantedScopes: ["write:chat"],
  });
  assert.equal(mass.ok, false);

  const publish = evaluateGuardrail({
    kind: "content.publish",
    agent: "content",
    phase: 0,
    user: null,
    grantedScopes: [],
  });
  assert.equal(publish.ok, false);
  if (!publish.ok) assert.equal(publish.skip, "waiting_for_login");
});

test("auto-publish stays refused in Phase 0/1 even when logged in", () => {
  const d = evaluateGuardrail({
    kind: "content.publish",
    agent: "content",
    phase: 0,
    user: { uuid: "x" },
    grantedScopes: ["write:post"],
  });
  assert.equal(d.ok, false);
  if (!d.ok) assert.equal(d.code, "refuse_auto_publish");
});
