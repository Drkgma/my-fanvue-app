import type { AgentId, AgentMode, FanvueMe, Phase } from "./types";

export const PHASE_LABELS: Record<Phase, string> = {
  0: "Foundation",
  1: "First converts",
  2: "Repeatable",
  3: "Monetization",
  4: "Traffic",
  5: "Scale",
};

/** Subscriber bands from the growth ladder. Unauthenticated defaults to 1 → Phase 0. */
export function phaseFromSubscriberCount(count: number): Phase {
  const n = Number.isFinite(count) ? Math.max(0, Math.floor(count)) : 1;
  if (n <= 1) return 0;
  if (n <= 20) return 1;
  if (n <= 50) return 2;
  if (n <= 200) return 3;
  if (n <= 1000) return 4;
  return 5;
}

export function subscriberCountFromUser(user: FanvueMe | null): number {
  if (!user) return 1;
  const n = user.fanCounts?.subscribersCount;
  if (typeof n === "number" && Number.isFinite(n)) return Math.max(0, n);
  return 0;
}

export function detectPhase(user: FanvueMe | null): {
  phase: Phase;
  subscriberCount: number;
  source: "users/me" | "default_unauthenticated";
} {
  if (!user) {
    return { phase: 0, subscriberCount: 1, source: "default_unauthenticated" };
  }
  const subscriberCount = subscriberCountFromUser(user);
  return {
    phase: phaseFromSubscriberCount(subscriberCount),
    subscriberCount,
    source: "users/me",
  };
}

/**
 * Current phase + one phase ahead.
 * Analytics local logging is always lite; live insights stay gated.
 */
export function agentModeForPhase(agent: AgentId, phase: Phase): AgentMode {
  const maxEnabled = Math.min(5, (phase + 1) as Phase);

  switch (agent) {
    case "content":
      return phase >= 0 ? (phase >= 2 ? "active" : "lite") : "off";
    case "chatmate":
      return phase >= 0 ? (phase >= 2 ? "active" : "lite") : "off";
    case "money":
      if (maxEnabled < 1) return "off";
      return phase >= 2 ? "active" : "lite";
    case "traffic":
      if (maxEnabled < 1) return "off";
      return phase >= 4 ? "active" : "lite";
    case "analytics":
      return phase >= 3 ? "active" : "lite";
    default:
      return "off";
  }
}

export function agentsEnabledForPhase(phase: Phase): AgentId[] {
  const ids: AgentId[] = ["content", "chatmate", "money", "traffic", "analytics"];
  return ids.filter((id) => agentModeForPhase(id, phase) !== "off");
}

export function realisticEnvelope(phase: Phase): string {
  if (phase <= 1) {
    return "90-day ceiling for a beginner page: tens of subscribers and hundreds to low thousands of dollars if execution is strong — not $1M.";
  }
  if (phase <= 3) {
    return "This phase is still a small creator business. Plan for process and modest compounding, not celebrity-scale revenue.";
  }
  return "Scale only what already works. Do not jump to $1M models.";
}
