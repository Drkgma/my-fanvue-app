from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path
from random import Random

from agents.improve_agent import (
    FORBIDDEN,
    choose_action,
    credit_open,
    format_report,
    lift_between,
    pick_share_variant,
    run,
    score_lift,
)
from improve_memory import empty_memory, load_memory, save_memory


NOW = datetime(2026, 8, 29, 17, 0, tzinfo=timezone.utc)


def test_zero_followers_picks_intro_before_share() -> None:
    snapshot = {
        "subscribers": 0,
        "followers": 0,
        "trial_used": 0,
        "video_count": 0,
        "ppv_ready": 0,
        "trial_max": 10,
    }
    action = choose_action(snapshot, empty_memory(), now=NOW, explore_rate=0, rng=Random(0))
    assert action["kind"] == "intro_nudge"
    assert action["kind"] not in FORBIDDEN


def test_after_intro_picks_share_variant() -> None:
    memory = empty_memory()
    memory["experiments"] = [{"kind": "intro_nudge", "at": "2026-08-29T16:00:00+00:00"}]
    snapshot = {
        "subscribers": 0,
        "followers": 0,
        "trial_used": 0,
        "video_count": 0,
        "ppv_ready": 0,
    }
    action = choose_action(snapshot, memory, now=NOW, explore_rate=1, rng=Random(0))
    assert action["kind"] == "share_variant"
    assert action["variant"] in {"soft", "trial", "ask"}
    assert "reddit" not in (action.get("reason") or "").lower()


def test_ten_subs_does_not_unlock_traffic() -> None:
    snapshot = {
        "subscribers": 10,
        "followers": 12,
        "trial_used": 4,
        "video_count": 1,
        "ppv_ready": 0,
    }
    action = choose_action(snapshot, empty_memory(), now=NOW)
    assert action["kind"] == "phase1_ready"
    assert action["kind"] not in FORBIDDEN
    assert "TrafficAgent" in action["reason"]


def test_credit_open_scores_trial_lift() -> None:
    memory = empty_memory()
    memory["open_experiment"] = {
        "kind": "share_variant",
        "variant": "trial",
        "before": {"subscribers": 0, "followers": 0, "trial_used": 0, "earnings_cents": 399, "video_count": 0, "ppv_ready": 0},
    }
    credited = credit_open(
        memory,
        {"subscribers": 0, "followers": 1, "trial_used": 2, "earnings_cents": 399, "video_count": 0, "ppv_ready": 0},
    )
    assert credited is not None
    assert credited["lift"]["trial_used"] == 2
    assert credited["lift"]["followers"] == 1
    assert score_lift(credited["lift"]) == 4 * 2 + 3 * 1
    assert memory["variant_scores"]["trial"]["n"] == 1
    assert memory["open_experiment"] is None


def test_pick_share_prefers_winning_variant() -> None:
    memory = empty_memory()
    memory["variant_scores"] = {
        "soft": {"n": 2, "score": 0},
        "trial": {"n": 2, "score": 8},
        "ask": {"n": 1, "score": 1},
    }
    picked = pick_share_variant(memory, explore_rate=0, rng=Random(0))
    assert picked["id"] == "trial"


def test_lift_between_and_report_include_trial() -> None:
    lift = lift_between(
        {"subscribers": 0, "followers": 0, "trial_used": 0, "earnings_cents": 0, "video_count": 0, "ppv_ready": 0},
        {"subscribers": 1, "followers": 2, "trial_used": 1, "earnings_cents": 100, "video_count": 0, "ppv_ready": 0},
    )
    assert lift["subscribers"] == 1
    text = format_report(
        {
            "subscribers": 1,
            "followers": 2,
            "trial_used": 1,
            "trial_max": 10,
            "video_count": 0,
            "trial_url": "https://www.fanvue.com/funny-kite-83?free_trial=abc",
        },
        {"kind": "hold", "reason": "watching"},
        {"kind": "share_variant", "variant": "trial", "score": 7, "lift": lift},
    )
    assert "self-improving" in text
    assert "I will not post to Reddit" in text
    assert "free_trial=abc" in text


def test_run_sends_and_persists(tmp_path: Path) -> None:
    sent: list[str] = []
    snapshot = {
        "at": "2026-08-29T17:00:00+00:00",
        "subscribers": 0,
        "followers": 0,
        "trial_used": 0,
        "video_count": 0,
        "ppv_ready": 0,
        "trial_url": "https://www.fanvue.com/funny-kite-83?free_trial=abc",
        "public_url": "https://www.fanvue.com/funny-kite-83",
        "trial_max": 10,
    }
    dest = tmp_path / "memory.json"
    progress = tmp_path / "progress.json"
    import agents.improve_agent as improve_agent

    improve_agent.PROGRESS_PATH = progress
    result = run(
        snapshot=snapshot,
        memory_path=dest,
        send_fn=lambda text: sent.append(text) or {"ok": True},
        explore_rate=0,
        rng=Random(0),
    )
    assert result["action"]["kind"] == "intro_nudge"
    assert result["forbidden"] is False
    assert sent and "Discover gap" in sent[0]
    saved = load_memory(dest)
    assert saved["open_experiment"]["kind"] == "intro_nudge"
    assert "improve_kind" in progress.read_text(encoding="utf-8")


def test_memory_roundtrip(tmp_path: Path) -> None:
    dest = tmp_path / "m.json"
    memory = empty_memory()
    memory["snapshots"] = [{"subscribers": 0}]
    save_memory(memory, dest)
    loaded = load_memory(dest)
    assert loaded["snapshots"][0]["subscribers"] == 0
