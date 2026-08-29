"""Send Phase 0 status to @drkgma78bot. Token and chat id stay in gitignored env."""

from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any

import requests
from dotenv import dotenv_values, load_dotenv

from config_loader import ROOT

load_dotenv(ROOT.parent / ".env.local")
load_dotenv(ROOT.parent / ".env")
load_dotenv(ROOT / ".env")

API = "https://api.telegram.org"


def _file_env() -> dict[str, str]:
    values: dict[str, str] = {}
    for path in (ROOT.parent / ".env.local", ROOT.parent / ".env", ROOT / ".env"):
        if path.exists():
            values.update({k: (v or "") for k, v in dotenv_values(path).items() if k})
    return values


def _token() -> str:
    return (os.getenv("TELEGRAM_BOT_TOKEN") or _file_env().get("TELEGRAM_BOT_TOKEN") or "").strip()


def _bot_id() -> str:
    token = _token()
    if not token:
        return ""
    try:
        body = requests.get(f"{API}/bot{token}/getMe", timeout=15).json()
        return str(((body.get("result") or {}).get("id") or ""))
    except requests.RequestException:
        return ""


def _chat_id() -> str:
    """Prefer a private user chat. Ignore a chat id that is the bot itself."""
    bot_id = _bot_id()
    candidates = [
        (_file_env().get("TELEGRAM_CHAT_ID") or "").strip(),
        (os.getenv("TELEGRAM_CHAT_ID") or "").strip(),
    ]
    for candidate in candidates:
        if candidate and candidate != bot_id:
            return candidate
    return discover_chat_id() or ""


def configured() -> bool:
    """True when both token and chat id are present."""
    return bool(_token() and _chat_id())


def format_status(payload: dict[str, Any]) -> str:
    """Human scoreboard for Telegram. No raw token dumps, no fan PII."""
    lines = ["Funny Kite — Phase 0"]
    handle = payload.get("handle")
    if handle:
        lines.append(f"Handle: @{handle}")
    if "subscribers" in payload:
        lines.append(
            f"Subs: {payload.get('subscribers')}/{payload.get('next_milestone') or 10}"
        )
    if "followers" in payload:
        lines.append(f"Followers: {payload.get('followers')}")
    if "earnings_cents" in payload:
        cents = int(payload.get("earnings_cents") or 0)
        lines.append(f"Earnings: ${cents / 100:.2f}")
    if payload.get("public_url"):
        lines.append(f"Page: {payload.get('public_url')}")
    if payload.get("trial_url"):
        used = payload.get("trial_used")
        cap = payload.get("trial_max")
        days = payload.get("trial_days") or 7
        lines.append(
            f"Free trial ({days} days, {used or 0}/{cap or 10}): {payload.get('trial_url')}"
        )
    if "posts_listed" in payload:
        lines.append(f"Posts listed: {payload.get('posts_listed')}")
    if "teasers_posted" in payload:
        lines.append(f"Teasers posted (total): {payload.get('teasers_posted')}")
    if "leftover_teasers" in payload:
        lines.append(f"Leftover vault teasers: {payload.get('leftover_teasers')}")
    if payload.get("ppv_total") is not None:
        lines.append(
            f"PPV catalog: {payload.get('ppv_ready') or 0}/{payload.get('ppv_total')} files ready"
        )
    if payload.get("ppv_posted") is not None:
        lines.append(f"PPV wall posts: {payload.get('ppv_posted')}")
    sell = payload.get("sell_packs") or []
    if sell:
        bits = []
        for pack in sell:
            dollars = int(pack.get("price_cents") or 0) // 100
            mark = "ready" if pack.get("ready") else "need files"
            bits.append(f"{pack.get('title') or pack.get('id')} ${dollars} {mark}")
        lines.append("Tip menu: " + "; ".join(bits))
    packs = payload.get("ppv_packs") or []
    if packs:
        done = sum(1 for pack in packs if pack.get("ready") == pack.get("total") and pack.get("total"))
        lines.append(f"Script packs complete: {done}/{len(packs)}")
    if payload.get("catalog_total") is not None:
        lines.append(
            f"PPV catalog: {payload.get('ready') or 0}/{payload.get('catalog_total')} files ready"
        )
    if "bank" in payload:
        lines.append(f"Content bank: {payload.get('bank')} files")
    if "uploaded" in payload:
        uploaded = payload.get("uploaded") or []
        posted = payload.get("posted") or []
        lines.append(f"Uploaded this run: {len(uploaded)}")
        if payload.get("catalog_total") is not None:
            lines.append(f"PPV posted this run: {len(posted)}")
        else:
            lines.append(f"Teasers posted this run: {len(posted)}")
    if payload.get("share_note"):
        lines.append(str(payload["share_note"]))
    if payload.get("auth_error"):
        lines.append(f"Auth: BLOCKED — {payload['auth_error']}")
    if payload.get("note"):
        lines.append(str(payload["note"]))
    return "\n".join(lines)


def format_share(payload: dict[str, Any]) -> str:
    """Copy-paste kit. Posts do not create subscribers until someone sees the page."""
    public = str(payload.get("public_url") or "https://www.fanvue.com/funny-kite-83")
    url = str(payload.get("trial_url") or public)
    captions = payload.get("teaser_captions") or [
        "hi, it's me — more on the page if you want it",
        "garden light, come say hi",
        "kitchen tea and a quiet morning",
    ]
    video_count = payload.get("video_count")
    lines = [
        "Funny Kite — share this to get subscribers",
        f"Page: {public}",
    ]
    if url != public:
        used = payload.get("trial_used")
        cap = payload.get("trial_max")
        days = payload.get("trial_days") or 7
        lines.append(f"Free trial ({days} days, {used or 0}/{cap or 10} uses): {url}")
    lines.extend(
        [
            f"Subs: {payload.get('subscribers', '?')}/{payload.get('next_milestone') or 10}",
            f"Followers: {payload.get('followers', '?')}",
            f"Posts live: {payload.get('posts_listed', '?')}",
            "",
            "Fanvue does not send people to an empty follower count.",
            "Do this today:",
            f"1. Text this link to 10 people you already talk to: {url}",
            "2. Paste it in your own IG / Snap / WhatsApp bio. Clothes-on only.",
            "3. Film a 15–30s clothed intro video in Fanvue Settings → Profile.",
            "   Discover places intro videos. No nudes in the intro.",
            "Ads and TrafficAgent stay off until 10 subscribers.",
            "",
            "Copy-paste:",
            f"{captions[0]}",
            url,
        ]
    )
    if url != public:
        lines[lines.index("Do this today:") + 1] = (
            f"1. Text this 7-day free trial to 10 people you already talk to: {url}"
        )
    if video_count == 0:
        lines.insert(5, "Intro videos on page: 0 — this is the Discover gap.")
    return "\n".join(lines)


def send(text: str) -> dict[str, Any]:
    """Post a message. Returns {ok: False, reason} when Telegram is not configured."""
    token = _token()
    chat_id = _chat_id()
    if not token:
        return {"ok": False, "reason": "TELEGRAM_BOT_TOKEN missing"}
    if not chat_id:
        return {"ok": False, "reason": "TELEGRAM_CHAT_ID missing — open @drkgma78bot and tap /start"}
    response = requests.post(
        f"{API}/bot{token}/sendMessage",
        json={"chat_id": chat_id, "text": text[:4000], "disable_web_page_preview": True},
        timeout=20,
    )
    try:
        body = response.json()
    except ValueError:
        body = {"ok": False, "description": response.text[:300]}
    if not response.ok or not body.get("ok"):
        return {
            "ok": False,
            "status": response.status_code,
            "reason": str(body.get("description") or body)[:300],
        }
    return {"ok": True, "message_id": (body.get("result") or {}).get("message_id")}


def send_status(payload: dict[str, Any]) -> dict[str, Any]:
    """Format and send a scoreboard payload."""
    return send(format_status(payload))


def _auth() -> tuple[str, str] | dict[str, Any]:
    token = _token()
    chat_id = _chat_id()
    if not token:
        return {"ok": False, "reason": "TELEGRAM_BOT_TOKEN missing"}
    if not chat_id:
        return {"ok": False, "reason": "TELEGRAM_CHAT_ID missing — open [REDACTED] and tap /start"}
    return token, chat_id


def send_photo(path: Path, caption: str = "") -> dict[str, Any]:
    """Send one local photo. Does not post off-platform."""
    auth = _auth()
    if isinstance(auth, dict):
        return auth
    token, chat_id = auth
    file_path = Path(path)
    if not file_path.is_file():
        return {"ok": False, "reason": "no image file"}
    mime = "image/jpeg" if file_path.suffix.lower() in {".jpg", ".jpeg"} else "image/png"
    with file_path.open("rb") as handle:
        response = requests.post(
            f"{API}/bot{token}/sendPhoto",
            data={"chat_id": chat_id, "caption": (caption or "")[:1024]},
            files={"photo": (file_path.name, handle, mime)},
            timeout=120,
        )
    try:
        body = response.json()
    except ValueError:
        body = {"ok": False, "description": response.text[:300]}
    if not response.ok or not body.get("ok"):
        return {
            "ok": False,
            "status": response.status_code,
            "reason": str(body.get("description") or body)[:300],
        }
    return {"ok": True, "message_id": (body.get("result") or {}).get("message_id")}


def send_media_group(paths: list[Path], caption: str = "") -> dict[str, Any]:
    """Send 1–10 local photos. One file uses sendPhoto; 2–10 use an album."""
    auth = _auth()
    if isinstance(auth, dict):
        return auth
    token, chat_id = auth
    files = [Path(path) for path in paths if Path(path).is_file()]
    if not files:
        return {"ok": False, "reason": "no image files"}
    if len(files) == 1:
        return send_photo(files[0], caption)
    if len(files) > 10:
        files = files[:10]
    media: list[dict[str, Any]] = []
    handles: dict[str, Any] = {}
    opened: list[Any] = []
    try:
        for index, path in enumerate(files):
            field = f"photo{index}"
            handle = path.open("rb")
            opened.append(handle)
            mime = "image/jpeg" if path.suffix.lower() in {".jpg", ".jpeg"} else "image/png"
            handles[field] = (path.name, handle, mime)
            item: dict[str, Any] = {"type": "photo", "media": f"attach://{field}"}
            if index == 0 and caption:
                item["caption"] = caption[:1024]
            media.append(item)
        response = requests.post(
            f"{API}/bot{token}/sendMediaGroup",
            data={"chat_id": chat_id, "media": json.dumps(media)},
            files=handles,
            timeout=120,
        )
    finally:
        for handle in opened:
            handle.close()
    try:
        body = response.json()
    except ValueError:
        body = {"ok": False, "description": response.text[:300]}
    if not response.ok or not body.get("ok"):
        return {
            "ok": False,
            "status": response.status_code,
            "reason": str(body.get("description") or body)[:300],
        }
    results = body.get("result") or []
    return {
        "ok": True,
        "count": len(results) if isinstance(results, list) else 1,
        "message_ids": [
            row.get("message_id") for row in results if isinstance(row, dict)
        ],
    }


def get_updates(offset: int | None = None, timeout: int = 0) -> list[dict[str, Any]]:
    """Long-poll Telegram getUpdates. Empty list when the bot is not configured."""
    token = _token()
    if not token:
        return []
    params: dict[str, Any] = {"limit": 50, "timeout": int(timeout)}
    if offset is not None:
        params["offset"] = int(offset)
    wait = max(20, int(timeout) + 10)
    response = requests.get(f"{API}/bot{token}/getUpdates", params=params, timeout=wait)
    try:
        body = response.json()
    except ValueError:
        return []
    if not response.ok or not body.get("ok"):
        return []
    rows = body.get("result") or []
    return rows if isinstance(rows, list) else []


def discover_chat_id() -> str | None:
    """Read the latest private-chat id from getUpdates. Does not print the token."""
    token = _token()
    if not token:
        return None
    response = requests.get(f"{API}/bot{token}/getUpdates", params={"limit": 50}, timeout=20)
    response.raise_for_status()
    body = response.json()
    if not body.get("ok"):
        return None
    chat_id = None
    for update in body.get("result") or []:
        message = update.get("message") or update.get("edited_message") or {}
        chat = message.get("chat") or {}
        if chat.get("type") == "private" and chat.get("id") is not None:
            chat_id = str(chat["id"])
    return chat_id
