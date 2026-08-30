"""Self-improving Phase 0 loop: measure → score last try → pick the next safe act.

Refuses Reddit/X/TikTok/Instagram posting, TrafficAgent, and ChatMate under 10 subs.
Does not generate nudes. Cannot text friends or film an intro.
"""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from random import Random
from typing import Any, Callable

from agent_log import get_logger
from config_loader import ROOT, load_config
from improve_memory import load_memory, save_memory
from jobs import utc_now
from telegram_notify import format_share, send

PROGRESS_PATH = ROOT / "progress.json"
FORBIDDEN = frozenset({"traffic", "reddit", "x", "twitter", "tiktok", "instagram", "chat_enable"})

SHARE_VARIANTS = (
    {"id": "soft", "caption": "hi, it's me — more on the page if you want it"},
    {"id": "trial", "caption": "7 days free if you want to see more"},
    {"id": "ask", "caption": "hey — what do you actually want to see next?"},
)

WELCOME_VARIANTS = (
    {
        "id": "packs",
        "new_follower": "Thanks for following. Subscribe for the feed, or ask for Pack 1–4.",
        "first_message_reply": "Hey — Pack 1 is $9, Pack 4 is $75 only nudes. Which one?",
    },
    {
        "id": "trial",
        "new_follower": "Thanks for following. Subscribe for the feed. If someone sent you a trial, start it today.",
        "first_message_reply": "Subscribe first. Pack 1 is $9 if you already know what you want.",
    },
)


def parse_ts(raw: str | None) -> datetime | None:
    if not raw:
        return None
    try:
        stamp = datetime.fromisoformat(str(raw).replace("Z", "+00:00"))
    except ValueError:
        return None
    if stamp.tzinfo is None:
        stamp = stamp.replace(tzinfo=timezone.utc)
    return stamp


def hours_since(raw: str | None, now: datetime | None = None) -> float:
    stamp = parse_ts(raw)
    if stamp is None:
        return 1e9
    current = now or datetime.now(timezone.utc)
    if current.tzinfo is None:
        current = current.replace(tzinfo=timezone.utc)
    return max(0.0, (current - stamp).total_seconds() / 3600.0)


def metrics(row: dict[str, Any]) -> dict[str, int]:
    return {
        "subscribers": int(row.get("subscribers") or 0),
        "followers": int(row.get("followers") or 0),
        "trial_used": int(row.get("trial_used") or 0),
        "earnings_cents": int(row.get("earnings_cents") or 0),
        "video_count": int(row.get("video_count") or 0),
        "ppv_ready": int(row.get("ppv_ready") or 0),
    }


def lift_between(before: dict[str, Any], after: dict[str, Any]) -> dict[str, int]:
    old = metrics(before)
    new = metrics(after)
    return {key: new[key] - old[key] for key in old}


def score_lift(lift: dict[str, int]) -> float:
    return (
        5.0 * lift.get("subscribers", 0)
        + 3.0 * lift.get("followers", 0)
        + 4.0 * lift.get("trial_used", 0)
        + 0.01 * lift.get("earnings_cents", 0)
    )


def last_experiment(memory: dict[str, Any], kind: str) -> dict[str, Any] | None:
    for row in reversed(list(memory.get("experiments") or [])):
        if isinstance(row, dict) and row.get("kind") == kind:
            return row
    return None


def credit_open(memory: dict[str, Any], snapshot: dict[str, Any]) -> dict[str, Any] | None:
    """Score the last open experiment against this snapshot."""
    open_exp = memory.get("open_experiment")
    if not isinstance(open_exp, dict):
        return None
    before = open_exp.get("before") if isinstance(open_exp.get("before"), dict) else {}
    lift = lift_between(before, snapshot)
    scored = score_lift(lift)
    open_exp["lift"] = lift
    open_exp["score"] = scored
    open_exp["closed_at"] = snapshot.get("at") or utc_now()
    experiments = list(memory.get("experiments") or [])
    experiments.append(open_exp)
    memory["experiments"] = experiments
    if open_exp.get("kind") == "share_variant" and open_exp.get("variant"):
        scores = dict(memory.get("variant_scores") or {})
        key = str(open_exp["variant"])
        prev = dict(scores.get(key) or {})
        n = int(prev.get("n") or 0) + 1
        prev_score = float(prev.get("score") or 0)
        scores[key] = {"n": n, "score": prev_score + scored, "last_lift": lift}
        memory["variant_scores"] = scores
    memory["open_experiment"] = None
    return open_exp


def pick_share_variant(
    memory: dict[str, Any],
    *,
    explore_rate: float = 0.3,
    rng: Random | None = None,
) -> dict[str, str]:
    """Epsilon-greedy over share captions. Unused variants first."""
    rng = rng or Random(0)
    scores = memory.get("variant_scores") or {}
    ids = [row["id"] for row in SHARE_VARIANTS]
    unused = [row for row in SHARE_VARIANTS if row["id"] not in scores]
    if unused and (not scores or rng.random() < max(explore_rate, 0.0)):
        return dict(unused[0])
    if scores:
        best_id = max(scores, key=lambda key: float((scores.get(key) or {}).get("score") or 0))
        if unused and rng.random() < explore_rate:
            return dict(unused[0])
        for row in SHARE_VARIANTS:
            if row["id"] == best_id:
                return dict(row)
    return dict(SHARE_VARIANTS[0])


def choose_action(
    snapshot: dict[str, Any],
    memory: dict[str, Any],
    *,
    now: datetime | None = None,
    explore_rate: float = 0.3,
    rng: Random | None = None,
) -> dict[str, Any]:
    """Pick one safe next act. Never returns a forbidden kind."""
    current = metrics(snapshot)
    intro_recent = hours_since((last_experiment(memory, "intro_nudge") or {}).get("at"), now) < 20
    share_recent = hours_since((last_experiment(memory, "share_variant") or {}).get("at"), now) < 8
    welcome_recent = hours_since((last_experiment(memory, "rotate_welcome") or {}).get("at"), now) < 48
    pack_recent = hours_since((last_experiment(memory, "pack_nudge") or {}).get("at"), now) < 24

    if current["subscribers"] >= 10:
        action = {
            "kind": "phase1_ready",
            "reason": "10 subscribers — ChatMate can turn on. TrafficAgent still waits for phase 2.",
        }
    elif current["video_count"] == 0 and not intro_recent:
        action = {
            "kind": "intro_nudge",
            "reason": "Discover places intro videos. 0 on the page. I cannot film it.",
        }
    elif (current["followers"] == 0 or current["trial_used"] == 0) and not share_recent:
        variant = pick_share_variant(memory, explore_rate=explore_rate, rng=rng)
        action = {
            "kind": "share_variant",
            "variant": variant["id"],
            "caption": variant["caption"],
            "reason": "0 outbound traffic. Rotate the trial caption and ping Telegram.",
        }
    elif not welcome_recent and current["subscribers"] == 0:
        nxt = WELCOME_VARIANTS[0]
        last = last_experiment(memory, "rotate_welcome")
        if last and last.get("variant") == nxt["id"]:
            nxt = WELCOME_VARIANTS[1]
        action = {
            "kind": "rotate_welcome",
            "variant": nxt["id"],
            "welcome": {k: nxt[k] for k in ("new_follower", "first_message_reply")},
            "reason": "Nobody has subscribed yet. Try a different Fanvue welcome line.",
        }
    elif current["subscribers"] >= 1 and current["ppv_ready"] == 0 and not pack_recent:
        action = {
            "kind": "pack_nudge",
            "reason": "Someone is in. Pack files still missing. I will not generate them.",
        }
    else:
        action = {
            "kind": "hold",
            "reason": "Watching the scoreboard. No new safe lever this hour.",
        }
    if action["kind"] in FORBIDDEN:
        raise RuntimeError(f"refused forbidden action {action['kind']}")
    return action


def format_report(snapshot: dict[str, Any], action: dict[str, Any], credited: dict[str, Any] | None) -> str:
    """Human recap for Telegram. No tokens, no fan PII."""
    current = metrics(snapshot)
    lines = [
        "Funny Kite — self-improving agent",
        f"Subs {current['subscribers']}/10 · followers {current['followers']} · "
        f"trial {current['trial_used']}/{snapshot.get('trial_max') or 10} · "
        f"intro videos {current['video_count']}",
    ]
    if credited:
        lift = credited.get("lift") or {}
        lines.append(
            f"Last try: {credited.get('kind')} {credited.get('variant') or ''} "
            f"score {credited.get('score')} "
            f"(subs {lift.get('subscribers', 0):+}, trial {lift.get('trial_used', 0):+})"
        )
    lines.append(f"Next: {action.get('kind')} {action.get('variant') or ''}".rstrip())
    if action.get("reason"):
        lines.append(str(action["reason"]))
    if action.get("caption"):
        lines.append(f"Caption: {action['caption']}")
    trial = snapshot.get("trial_url")
    if trial:
        lines.append(str(trial))
    lines.append("I will not post to Reddit, X, TikTok, or Instagram. TrafficAgent stays off.")
    return "\n".join(lines)


def apply_action(
    action: dict[str, Any],
    snapshot: dict[str, Any],
    *,
    send_fn: Callable[[str], dict[str, Any]] = send,
    install_welcome: Callable[..., dict[str, Any]] | None = None,
    preface: str = "",
) -> dict[str, Any]:
    """Execute one safe action. Returns telegram/Fanvue receipts."""
    kind = action.get("kind")
    if kind == "share_variant":
        payload = dict(snapshot)
        caption = str(action.get("caption") or "hi, it's me — more on the page if you want it")
        payload["teaser_captions"] = [caption]
        body = format_share(payload)
        text = f"{preface}\n\n{body}" if preface else body
        ping = send_fn(text[:4000])
        return {"telegram": ping}
    if kind == "intro_nudge":
        trial = snapshot.get("trial_url") or snapshot.get("public_url") or ""
        body = (
            "Discover gap: intro videos on the page: 0. "
            "Film a 15–30s clothed selfie in Fanvue Settings → Profile. "
            f"No nudes in the intro.\nTrial stays: {trial}"
        )
        ping = send_fn((f"{preface}\n\n{body}" if preface else body)[:4000])
        return {"telegram": ping}
    if kind == "rotate_welcome":
        welcome = dict(action.get("welcome") or {})
        if install_welcome is None:
            from agents.money_agent import install_account_setup

            install_welcome = install_account_setup
        cfg = load_config()
        money = dict(cfg.get("money") or {})
        merged_welcome = dict(money.get("welcome") or {})
        merged_welcome.update(welcome)
        money["welcome"] = merged_welcome
        cfg["money"] = money
        result = install_welcome(config=cfg)
        ping = send_fn(preface[:4000]) if preface else {"ok": True, "skipped": True}
        return {"welcome": result, "telegram": ping}
    if kind == "pack_nudge":
        body = (
            "Drop Pack 1 files: pack1-01.jpg + pack1-tease.mp4 in "
            "fanvue-automation/ppv_bank/. Instagram-sexy, not nude. "
            "I will not generate lingerie or nudes."
        )
        ping = send_fn((f"{preface}\n\n{body}" if preface else body)[:4000])
        return {"telegram": ping}
    if kind == "phase1_ready":
        body = (
            "Phase 0 is done. ChatMate can turn on. "
            "TrafficAgent, Reddit, and X stay off until phase 2."
        )
        ping = send_fn((f"{preface}\n\n{body}" if preface else body)[:4000])
        return {"telegram": ping}
    if preface:
        return {"held": True, "telegram": send_fn(preface[:4000])}
    return {"held": True}


def load_snapshot(path: Path | None = None) -> dict[str, Any]:
    dest = path or PROGRESS_PATH
    try:
        payload = json.loads(dest.read_text(encoding="utf-8"))
        return payload if isinstance(payload, dict) else {}
    except (OSError, ValueError, TypeError):
        return {}


def merge_progress(extra: dict[str, Any], path: Path | None = None) -> None:
    dest = path or PROGRESS_PATH
    data = load_snapshot(dest)
    data.update(extra)
    dest.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")


def run(
    snapshot: dict[str, Any] | None = None,
    memory_path: Path | None = None,
    *,
    send_fn: Callable[[str], dict[str, Any]] | None = None,
    install_welcome: Callable[..., dict[str, Any]] | None = None,
    explore_rate: float | None = None,
    rng: Random | None = None,
    notify: bool = True,
) -> dict[str, Any]:
    """One improve cycle. Safe levers only."""
    log = get_logger("improve")
    cfg = load_config()
    settings = cfg.get("improve") if isinstance(cfg.get("improve"), dict) else {}
    rate = float(explore_rate) if explore_rate is not None else float(settings.get("explore_rate") or 0.3)
    current = dict(snapshot or load_snapshot())
    if not current:
        log.info("no snapshot yet — run status first")
        return {"skipped": True, "reason": "no snapshot"}
    memory = load_memory(memory_path)
    credited = credit_open(memory, current)
    action = choose_action(current, memory, explore_rate=rate, rng=rng or Random())
    report = format_report(current, action, credited)
    applied = apply_action(
        action,
        current,
        send_fn=send_fn or send,
        install_welcome=install_welcome,
        preface=report if notify else "",
    )
    open_exp = {
        "kind": action.get("kind"),
        "variant": action.get("variant"),
        "at": utc_now(),
        "before": metrics(current),
        "reason": action.get("reason"),
    }
    memory["open_experiment"] = open_exp
    snaps = list(memory.get("snapshots") or [])
    snaps.append({"at": current.get("at") or utc_now(), **metrics(current)})
    memory["snapshots"] = snaps
    save_memory(memory, memory_path)
    ping = (applied or {}).get("telegram")
    merge_progress(
        {
            "improve_kind": action.get("kind"),
            "improve_reason": action.get("reason"),
            "improve_variant": action.get("variant"),
            "improve_at": open_exp["at"],
        }
    )
    log.info("improve next=%s variant=%s credited=%s", action.get("kind"), action.get("variant"), bool(credited))
    return {
        "action": action,
        "credited": credited,
        "applied": applied,
        "report": report,
        "telegram": ping,
        "forbidden": False,
    }
