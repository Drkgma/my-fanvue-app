"""Owner-only Telegram operator. Fanvue keeps running; this chat is the remote.

Does not post to Reddit, X, TikTok, or Instagram. Does not film an intro.
Unknown messages still get the trial link so there is no setup to learn.
"""

from __future__ import annotations

import json
import time
from pathlib import Path
from typing import Any

from agent_log import get_logger
from config_loader import ROOT, load_config
from telegram_notify import (
    _chat_id,
    format_share,
    format_status,
    get_updates,
    send,
)

OFFSET_PATH = ROOT / "telegram_offset.json"
PROGRESS_PATH = ROOT / "progress.json"

HELP = (
    "Funny Kite — hands-off while this VM is up.\n"
    "I run Fanvue: welcome DMs, $9.99, teasers, trial link, scoreboard.\n"
    "/status  /share  /kit\n"
    "I do not post to Reddit, X, TikTok, or Instagram.\n"
    "I cannot text your friends or film a clothed intro video."
)


def parse_command(text: str) -> str:
    """Map a message to one action. Anything unknown still shares the trial."""
    token = (text or "").strip().split()[0].lower() if text else ""
    token = token.split("@", 1)[0]
    mapping = {
        "/start": "help",
        "/help": "help",
        "help": "help",
        "/status": "status",
        "status": "status",
        "/share": "share",
        "share": "share",
        "/kit": "kit",
        "kit": "kit",
    }
    return mapping.get(token, "share")


def load_offset(path: Path | None = None) -> int:
    dest = path or OFFSET_PATH
    try:
        payload = json.loads(dest.read_text(encoding="utf-8"))
        return int(payload.get("offset") or 0)
    except (OSError, ValueError, TypeError):
        return 0


def save_offset(value: int, path: Path | None = None) -> None:
    dest = path or OFFSET_PATH
    dest.write_text(json.dumps({"offset": int(value)}) + "\n", encoding="utf-8")


def load_progress(path: Path | None = None) -> dict[str, Any]:
    dest = path or PROGRESS_PATH
    try:
        payload = json.loads(dest.read_text(encoding="utf-8"))
        return payload if isinstance(payload, dict) else {}
    except (OSError, ValueError, TypeError):
        return {}


def _share_payload(progress: dict[str, Any] | None = None) -> dict[str, Any]:
    data = dict(progress or load_progress())
    cfg = load_config()
    data.setdefault(
        "teaser_captions",
        list((cfg.get("content") or {}).get("teaser_captions") or []),
    )
    data.setdefault("public_url", "https://www.fanvue.com/funny-kite-83")
    return data


def reply_for(command: str, progress: dict[str, Any] | None = None) -> str | None:
    """Text to send, or None when /kit sends albums itself."""
    payload = _share_payload(progress)
    if command == "status":
        return format_status(payload)
    if command == "help":
        return HELP + "\n\n" + format_share(payload)
    if command == "kit":
        return None
    return format_share(payload)


def dispatch(command: str) -> dict[str, Any]:
    """Run one owner command. /kit uploads albums; others are text."""
    log = get_logger("operator")
    if command == "kit":
        from social_kit import run as send_social_kit

        result = send_social_kit(_share_payload())
        log.info("operator kit albums=%s", len(result.get("albums") or []))
        return {"command": "kit", "result": result}
    text = reply_for(command)
    ping = send(text or "")
    return {"command": command, "telegram": ping}


def handle_update(update: dict[str, Any], owner_chat: str) -> dict[str, Any] | None:
    """Ignore other chats. Return a dispatch summary when the owner wrote."""
    message = update.get("message") or update.get("edited_message") or {}
    chat = message.get("chat") or {}
    if str(chat.get("id") or "") != str(owner_chat):
        return None
    if chat.get("type") and chat.get("type") != "private":
        return None
    text = str(message.get("text") or "")
    command = parse_command(text)
    return dispatch(command)


def poll_once(*, timeout: int = 25, offset_path: Path | None = None) -> dict[str, Any]:
    """Fetch and handle one getUpdates batch."""
    owner = _chat_id()
    if not owner:
        return {"ok": False, "reason": "no owner chat"}
    path = offset_path or OFFSET_PATH
    offset = load_offset(path)
    rows = get_updates(offset=offset or None, timeout=timeout)
    last = offset
    if offset == 0 and rows:
        last = max(int(row.get("update_id") or 0) for row in rows if isinstance(row, dict)) + 1
        save_offset(last, path)
        return {
            "ok": True,
            "updates": len(rows),
            "handled": 0,
            "offset": last,
            "skipped_backlog": True,
        }
    handled = 0
    for row in rows:
        if not isinstance(row, dict):
            continue
        uid = int(row.get("update_id") or 0)
        last = max(last, uid + 1)
        if handle_update(row, owner):
            handled += 1
    if last != offset:
        save_offset(last, path)
    return {"ok": True, "updates": len(rows), "handled": handled, "offset": last}


def poll_forever() -> None:
    """Block and operate the owner chat until the process dies with the VM."""
    log = get_logger("operator")
    log.info("telegram operator listening")
    while True:
        try:
            result = poll_once(timeout=25)
            if not result.get("ok"):
                time.sleep(5)
        except Exception as exc:  # noqa: BLE001 — stay up
            log.error("operator poll failed: %s", exc)
            time.sleep(5)
