import assert from "node:assert/strict";
import { test } from "node:test";
import { detectPhase, phaseFromSubscriberCount, agentModeForPhase } from "./phase.ts";

test("unauthenticated defaults to 1 subscriber / Phase 0", () => {
  const d = detectPhase(null);
  assert.equal(d.subscriberCount, 1);
  assert.equal(d.phase, 0);
  assert.equal(d.source, "default_unauthenticated");
});

test("subscriber bands match the growth ladder", () => {
  assert.equal(phaseFromSubscriberCount(0), 0);
  assert.equal(phaseFromSubscriberCount(1), 0);
  assert.equal(phaseFromSubscriberCount(2), 1);
  assert.equal(phaseFromSubscriberCount(20), 1);
  assert.equal(phaseFromSubscriberCount(21), 2);
  assert.equal(phaseFromSubscriberCount(200), 3);
  assert.equal(phaseFromSubscriberCount(201), 4);
  assert.equal(phaseFromSubscriberCount(1001), 5);
});

test("phase 0 enables current + one ahead only as lite", () => {
  assert.equal(agentModeForPhase("content", 0), "lite");
  assert.equal(agentModeForPhase("chatmate", 0), "lite");
  assert.equal(agentModeForPhase("money", 0), "lite");
  assert.equal(agentModeForPhase("traffic", 0), "lite");
  assert.equal(agentModeForPhase("analytics", 0), "lite");
});

test("authenticated zero subs is still Phase 0", () => {
  const d = detectPhase({ fanCounts: { subscribersCount: 0 } });
  assert.equal(d.phase, 0);
  assert.equal(d.subscriberCount, 0);
});
