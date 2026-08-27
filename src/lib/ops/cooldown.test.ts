import assert from "node:assert/strict";
import { test } from "node:test";
import { canOutbound, recordOutbound } from "./cooldown.ts";
import { EMPTY_STATE } from "./types.ts";

test("24-hour rule blocks overlapping outbound campaigns", () => {
  const t0 = new Date("2026-08-27T12:00:00.000Z");
  const state = recordOutbound(EMPTY_STATE, "traffic", "traffic.campaign", t0);
  const soon = canOutbound(state, "content", "content.publish", new Date("2026-08-27T18:00:00.000Z"));
  assert.equal(soon.ok, false);
  if (!soon.ok) assert.equal(soon.reason, "global");

  const later = canOutbound(state, "content", "content.publish", new Date("2026-08-28T12:00:01.000Z"));
  assert.equal(later.ok, true);
});
