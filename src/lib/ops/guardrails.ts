import type { AgentId, FanvueMe, OutboundKind, Phase, SkipReason } from "./types";

export type GuardrailRequest = {
  kind: OutboundKind | "fantasy.million" | "scrape" | "spam";
  agent: AgentId | "orchestrator";
  phase: Phase;
  user: FanvueMe | null;
  grantedScopes: string[];
  text?: string;
};

export type GuardrailDecision =
  | { ok: true }
  | { ok: false; code: string; message: string; skip: SkipReason };

const FANTASY_RE =
  /\$?\s*1\s*(,?000,000|m\b|million)|get rich|lambo|\$1m|million dollars in (3|three) months/i;

export function looksLikeFantasyTarget(text: string | undefined): boolean {
  if (!text) return false;
  return FANTASY_RE.test(text);
}

export function evaluateGuardrail(req: GuardrailRequest): GuardrailDecision {
  if (req.kind === "fantasy.million" || looksLikeFantasyTarget(req.text)) {
    return {
      ok: false,
      code: "refuse_million_fantasy",
      message:
        "A million dollars in three months is not a Phase 0/1 target. This account is treated as a beginner page. The useful work is login, posting, and real chats — not a $1M roadmap.",
      skip: "guardrail",
    };
  }

  if (req.kind === "scrape") {
    return {
      ok: false,
      code: "refuse_scrape",
      message: "Scraping Fanvue or other platforms is not allowed. Use official OAuth APIs only.",
      skip: "guardrail",
    };
  }

  if (req.kind === "spam" || req.kind === "chatmate.mass_dm") {
    return {
      ok: false,
      code: "refuse_mass_dm",
      message:
        "Mass DMs and unsolicited PPV blasts are refused. ChatMate may draft one-to-one replies; a human sends them.",
      skip: "guardrail",
    };
  }

  if (req.kind === "traffic.campaign" && req.phase < 1) {
    return {
      ok: false,
      code: "refuse_early_traffic",
      message:
        "No traffic campaigns in Phase 0. Finish login, bio, and a posting rhythm first. Phase 1 allows one compliant promo checklist, not ads or spam.",
      skip: "phase_gated",
    };
  }

  if (
    (req.kind === "content.publish" || req.kind === "chatmate.send" || req.kind === "money.broadcast") &&
    !req.user
  ) {
    return {
      ok: false,
      code: "refuse_post_without_login",
      message:
        "No posting, messaging, or PPV send without Fanvue login. Register the redirect URI, then Login with Fanvue.",
      skip: "waiting_for_login",
    };
  }

  if (req.kind === "content.publish") {
    if (req.phase < 2) {
      return {
        ok: false,
        code: "refuse_auto_publish",
        message:
          "ContentAgent lite drafts captions only. Auto-publish needs Phase 2+ and write:post. Copy the draft into Fanvue yourself this week.",
        skip: "phase_gated",
      };
    }
    if (!req.grantedScopes.includes("write:post")) {
      return {
        ok: false,
        code: "missing_write_post",
        message: "Publishing requires write:post. Do not expand scopes until you will publish the same day.",
        skip: "missing_scope",
      };
    }
  }

  if (req.kind === "chatmate.send") {
    if (req.phase < 2) {
      return {
        ok: false,
        code: "refuse_auto_send",
        message:
          "ChatMate lite is templates and a draft queue. Auto-send is off until Phase 2 and a real chat volume.",
        skip: "phase_gated",
      };
    }
    if (!req.grantedScopes.includes("write:chat")) {
      return {
        ok: false,
        code: "missing_write_chat",
        message: "Sending requires write:chat. Drafts are available without it.",
        skip: "missing_scope",
      };
    }
  }

  if (req.kind === "money.broadcast") {
    return {
      ok: false,
      code: "refuse_ppv_spam",
      message:
        "MoneyBot does not broadcast PPV. It suggests a 3-item menu. You send offers by hand to people who already chatted.",
      skip: "guardrail",
    };
  }

  return { ok: true };
}
