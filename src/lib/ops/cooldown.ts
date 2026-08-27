import { COOLDOWN_MS, type AgentId, type OpsState, type OutboundKind } from "./types.ts";

export type CooldownDecision =
  | { ok: true }
  | { ok: false; reason: "global" | "agent"; retryAt: string; message: string };

function remaining(lastIso: string | null | undefined, now: Date): number {
  if (!lastIso) return 0;
  const last = Date.parse(lastIso);
  if (!Number.isFinite(last)) return 0;
  return last + COOLDOWN_MS - now.getTime();
}

/** 24-hour rule: no overlapping outbound campaigns; cooldown between outbound actions. */
export function canOutbound(
  state: OpsState,
  agent: AgentId,
  _kind: OutboundKind,
  now: Date,
): CooldownDecision {
  const globalLeft = remaining(state.lastOutboundAt, now);
  if (globalLeft > 0) {
    const retryAt = new Date(now.getTime() + globalLeft).toISOString();
    return {
      ok: false,
      reason: "global",
      retryAt,
      message: `24-hour rule: an outbound action already ran (${state.lastOutboundKind ?? "unknown"}). Wait until ${retryAt} so campaigns do not overlap.`,
    };
  }

  const agentLeft = remaining(state.agentCooldowns[agent], now);
  if (agentLeft > 0) {
    const retryAt = new Date(now.getTime() + agentLeft).toISOString();
    return {
      ok: false,
      reason: "agent",
      retryAt,
      message: `24-hour rule: ${agent} already took an outbound action. Retry after ${retryAt}.`,
    };
  }

  return { ok: true };
}

export function recordOutbound(
  state: OpsState,
  agent: AgentId,
  kind: OutboundKind,
  now: Date,
): OpsState {
  const iso = now.toISOString();
  return {
    ...state,
    lastOutboundAt: iso,
    lastOutboundAgent: agent,
    lastOutboundKind: kind,
    agentCooldowns: { ...state.agentCooldowns, [agent]: iso },
  };
}

export function cooldownStatus(state: OpsState, now: Date) {
  const globalLeft = remaining(state.lastOutboundAt, now);
  return {
    blocked: globalLeft > 0,
    retryAt: globalLeft > 0 ? new Date(now.getTime() + globalLeft).toISOString() : null,
    lastOutboundAt: state.lastOutboundAt,
    lastOutboundAgent: state.lastOutboundAgent,
    lastOutboundKind: state.lastOutboundKind,
  };
}
