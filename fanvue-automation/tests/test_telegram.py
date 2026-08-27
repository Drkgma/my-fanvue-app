from __future__ import annotations

from telegram_notify import format_status, send


def test_format_status_omits_missing_fields() -> None:
    text = format_status(
        {
            "handle": "funny-kite-83",
            "subscribers": 1,
            "next_milestone": 10,
            "followers": 0,
            "earnings_cents": 399,
            "posts_listed": 1,
            "bank": 31,
            "uploaded": [{"file": "a.png"}],
            "posted": [],
        }
    )
    assert "Funny Kite — Phase 0" in text
    assert "@funny-kite-83" in text
    assert "Subs: 1/10" in text
    assert "Earnings: $3.99" in text
    assert "Uploaded this run: 1" in text
    assert "Teasers posted: 0" in text


def test_send_skips_without_token(monkeypatch) -> None:
    monkeypatch.setattr("telegram_notify._token", lambda: "")
    monkeypatch.setattr("telegram_notify._chat_id", lambda: "1")
    assert send("hi") == {"ok": False, "reason": "TELEGRAM_BOT_TOKEN missing"}


def test_send_skips_without_chat(monkeypatch) -> None:
    monkeypatch.setattr("telegram_notify._token", lambda: "tok")
    monkeypatch.setattr("telegram_notify._chat_id", lambda: "")
    result = send("hi")
    assert result["ok"] is False
    assert "TELEGRAM_CHAT_ID" in result["reason"]
