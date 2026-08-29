from __future__ import annotations

from telegram_operator import parse_command, reply_for


def test_parse_command_defaults_to_share() -> None:
    assert parse_command("/kit") == "kit"
    assert parse_command("/status@bot") == "status"
    assert parse_command("hello") == "share"
    assert parse_command("") == "share"
    assert parse_command("/start") == "help"
    assert parse_command("/improve") == "improve"


def test_reply_for_share_includes_trial() -> None:
    text = reply_for(
        "share",
        {
            "public_url": "https://www.fanvue.com/funny-kite-83",
            "trial_url": "https://www.fanvue.com/funny-kite-83?free_trial=abc",
            "subscribers": 0,
            "followers": 0,
            "posts_listed": 37,
            "teaser_captions": ["hi, it's me — more on the page if you want it"],
        },
    )
    assert text is not None
    assert "free_trial=abc" in text
    assert "Reddit" in text or "Ads and TrafficAgent stay off" in text


def test_reply_for_kit_is_none() -> None:
    assert reply_for("kit", {}) is None


def test_help_says_no_reddit() -> None:
    text = reply_for(
        "help",
        {
            "public_url": "https://www.fanvue.com/funny-kite-83",
            "trial_url": "https://www.fanvue.com/funny-kite-83?free_trial=abc",
            "teaser_captions": ["hi"],
        },
    )
    assert text is not None
    assert "I do not post to Reddit" in text
    assert "free_trial=abc" in text


def test_poll_once_skips_backlog(tmp_path, monkeypatch) -> None:
    from telegram_operator import poll_once

    monkeypatch.setattr("telegram_operator._chat_id", lambda: "99")
    monkeypatch.setattr(
        "telegram_operator.get_updates",
        lambda **kwargs: [{"update_id": 5, "message": {"chat": {"id": 99, "type": "private"}, "text": "/kit"}}],
    )
    dest = tmp_path / "offset.json"
    result = poll_once(timeout=0, offset_path=dest)
    assert result["skipped_backlog"] is True
    assert result["handled"] == 0
    assert result["offset"] == 6

