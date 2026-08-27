import assert from "node:assert/strict";
import { test } from "node:test";
import { seedChatTemplates, seedContentPlan, seedMoneyMenu } from "./fixtures.ts";
import { buildTodayPlan, pickTodayContent, planDayNumber } from "./plan.ts";
import { EMPTY_STATE } from "./types.ts";

test("weekday mapping is Monday=1 through Sunday=7", () => {
  assert.equal(planDayNumber(new Date("2026-08-24T12:00:00.000Z")), 1);
  assert.equal(planDayNumber(new Date("2026-08-30T12:00:00.000Z")), 7);
});

test("unauthenticated plan is complete demo money path, not an empty state", () => {
  const now = new Date("2026-08-27T18:00:00.000Z");
  const nowIso = now.toISOString();
  const state = {
    ...EMPTY_STATE,
    contentDrafts: seedContentPlan(nowIso),
    chatDrafts: seedChatTemplates(nowIso),
    moneySuggestions: seedMoneyMenu(nowIso),
  };
  const plan = buildTodayPlan({
    state,
    phase: 0,
    subscriberCount: 1,
    waitingForLogin: true,
    user: null,
    now,
  });
  assert.equal(plan.mode, "demo");
  assert.equal(plan.phase, 0);
  assert.equal(plan.items.length, 6);
  assert.equal(plan.items[0].status, "blocked");
  assert.match(plan.items[0].detail, /fanvue.com\/developers/);
  assert.match(plan.expectedThisWeek, /\$6\.99/);
  assert.doesNotMatch(plan.headline, /1\s*m/i);
  const today = pickTodayContent(state, now);
  assert.ok(today);
  assert.equal(today.day, 4);
});

test("beginner ladder is sub + first PPV + tips, not celebrity pricing", () => {
  const menu = seedMoneyMenu("2026-08-27T00:00:00.000Z");
  assert.deepEqual(
    menu.map((m) => m.kind),
    ["subscription", "tip", "ppv", "tip"],
  );
  assert.ok(menu.every((m) => m.priceUsd <= 15));
  const chats = seedChatTemplates("2026-08-27T00:00:00.000Z");
  assert.ok(chats.some((c) => c.kind === "looker"));
  const content = seedContentPlan("2026-08-27T00:00:00.000Z");
  assert.ok(content.some((c) => c.placement === "ppv"));
  assert.equal(content.filter((c) => c.placement !== "ppv").length, 7);
});
