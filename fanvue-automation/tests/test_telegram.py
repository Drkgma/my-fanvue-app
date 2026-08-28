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
    assert "Teasers posted this run: 0" in text


def test_format_status_includes_share_note() -> None:
    text = format_status(
        {
            "handle": "funny-kite-83",
            "public_url": "https://www.fanvue.com/funny-kite-83",
            "subscribers": 0,
            "leftover_teasers": 16,
            "share_note": "0 followers: share the public page",
        }
    )
    assert "Page: https://www.fanvue.com/funny-kite-83" in text
    assert "Leftover vault teasers: 16" in text
    assert "share the public page" in text


def test_format_share_includes_copy_paste() -> None:
    from telegram_notify import format_share

    text = format_share(
        {
            "public_url": "https://www.fanvue.com/funny-kite-83",
            "subscribers": 0,
            "followers": 0,
            "posts_listed": 16,
            "teaser_captions": ["hi, it's me — more on the page if you want it"],
        }
    )
    assert "https://www.fanvue.com/funny-kite-83" in text
    assert "Copy-paste:" in text
    assert "Ads and TrafficAgent stay off" in text
    assert "10 people" in text
    assert "intro video" in text.lower()


def test_format_status_includes_ppv_catalog() -> None:
    text = format_status(
        {
            "handle": "funny-kite-83",
            "ppv_ready": 0,
            "ppv_total": 16,
            "ppv_posted": 0,
            "catalog_total": 16,
            "ready": 0,
            "uploaded": [],
            "posted": [],
        }
    )
    assert "PPV catalog: 0/16 files ready" in text
    assert "PPV posted this run: 0" in text


def test_format_status_includes_tip_menu_packs() -> None:
    text = format_status(
        {
            "handle": "funny-kite-83",
            "sell_packs": [
                {"id": "pack-1", "title": "Pack 1", "price_cents": 900, "ready": False},
                {"id": "pack-2", "title": "Pack 2", "price_cents": 2300, "ready": False},
                {"id": "pack-3", "title": "Pack 3", "price_cents": 3500, "ready": False},
                {"id": "pack-4", "title": "Pack 4", "price_cents": 7500, "ready": False},
            ],
        }
    )
    assert "Tip menu: Pack 1 $9 need files" in text
    assert "Pack 4 $75 need files" in text


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
