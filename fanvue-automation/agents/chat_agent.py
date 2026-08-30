"""ChatMate — reply to unread DMs. Phase 1+. Do not spray PPV at 1 subscriber."""

from __future__ import annotations

from typing import Any

from agent_log import get_logger
from config_loader import agent_allowed, load_config
from fanvue_client import FanvueApiError, FanvueAuthError, FanvueClient
from jobs import JobQueue


def draft_reply(name: str, latest_text: str, template: str) -> str:
    """Fill the configured template. Keep it short; this is a first pass, not a closer."""
    text = template or (
        "Hey {name} — thanks for writing. I saw your message and I will reply properly soon."
    )
    return text.format(name=name or "there", latest=(latest_text or "")[:60]).strip()


def run(client: FanvueClient | None = None, queue: JobQueue | None = None) -> dict[str, Any]:
    """Reply to unread chats. Idempotent per latest inbound message UUID."""
    log = get_logger("chat")
    config = load_config()
    allowed, reason = agent_allowed("chat", config)
    if not allowed:
        log.info(reason)
        return {"skipped": True, "reason": reason}

    owned_queue = queue is None
    queue = queue or JobQueue()
    client = client or FanvueClient()
    settings = config["chat"]
    limit = int(settings.get("max_replies_per_run") or 10)
    template = str(settings.get("reply_template") or "")
    summary: dict[str, Any] = {"replied": [], "skipped": []}

    try:
        me = client.get_me()
        my_uuid = me.get("uuid")
        unread = client.list_unread_chats()
        chats = list(unread.get("data") or [])
        log.info("unread chats: %s", len(chats))
        sent = 0
        for chat in chats:
            if sent >= limit:
                break
            fan = chat.get("user") or {}
            user_uuid = fan.get("uuid")
            if not user_uuid:
                continue
            history = client.get_messages(user_uuid, mark_as_read=False)
            messages = list(history.get("data") or [])
            if not messages:
                summary["skipped"].append({"user": user_uuid, "reason": "empty"})
                continue
            latest = messages[0]
            sender = (latest.get("sender") or {}).get("uuid")
            if sender == my_uuid:
                summary["skipped"].append({"user": user_uuid, "reason": "already_replied"})
                continue
            message_uuid = latest.get("uuid") or f"{user_uuid}:unknown"
            dedupe = f"chat:reply:{message_uuid}"
            if not queue.claim("chat", "reply", dedupe, {"user_uuid": user_uuid}):
                summary["skipped"].append({"user": user_uuid, "reason": "duplicate"})
                continue
            name = fan.get("displayName") or fan.get("handle") or "there"
            reply = draft_reply(name, str(latest.get("text") or ""), template)
            try:
                result = client.send_message(user_uuid, reply)
                queue.mark_done(dedupe, {"message_uuid": result.get("messageUuid")})
                summary["replied"].append({"user": user_uuid, "message_uuid": result.get("messageUuid")})
                sent += 1
                log.info("replied to %s -> %s", name, result.get("messageUuid"))
            except (FanvueAuthError, FanvueApiError) as exc:
                queue.mark_error(dedupe, str(exc))
                log.error("could not reply to %s: %s", user_uuid, exc)
        return summary
    finally:
        if owned_queue:
            queue.close()
