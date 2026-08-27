"""Send Phase 0 status to @drkgma78bot. Token and chat id stay in gitignored env."""

from __future__ import annotations

import os
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
    if "posts_listed" in payload:
        lines.append(f"Posts listed: {payload.get('posts_listed')}")
    if "bank" in payload:
        lines.append(f"Content bank: {payload.get('bank')} files")
    if "uploaded" in payload:
        uploaded = payload.get("uploaded") or []
        posted = payload.get("posted") or []
        lines.append(f"Uploaded this run: {len(uploaded)}")
        lines.append(f"Teasers posted: {len(posted)}")
    if payload.get("auth_error"):
        lines.append(f"Auth: BLOCKED — {payload['auth_error']}")
    if payload.get("note"):
        lines.append(str(payload["note"]))
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
