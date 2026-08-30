from __future__ import annotations

from agents.chat_agent import draft_reply
from agents.traffic_agent import run as run_traffic


def test_chat_draft_does_not_hard_sell() -> None:
    text = draft_reply("Sam", "hi", "Hey {name} — thanks for writing.")
    assert "Sam" in text
    assert "$" not in text


def test_traffic_refuses_in_phase_zero() -> None:
    result = run_traffic()
    assert result["skipped"] is True
    assert "phase" in result["reason"].lower() or "ChatMate" in result["reason"] or "2" in result["reason"]
