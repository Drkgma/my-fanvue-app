"""MoneyBot — welcome automations and a sane sub price. No mass PPV under 5 subs."""

from __future__ import annotations

import hashlib
from typing import Any

from agent_log import get_logger
from config_loader import agent_allowed, load_config
from fanvue_client import FanvueApiError, FanvueAuthError, FanvueClient
from jobs import JobQueue

WELCOME_TRIGGERS = ("new_follower", "new_subscriber", "first_message_reply")


def _text_key(trigger: str, text: str) -> str:
    digest = hashlib.sha256(text.encode("utf-8")).hexdigest()[:16]
    return f"money:welcome:{trigger}:{digest}"


def install_account_setup(
    client: FanvueClient | None = None,
    queue: JobQueue | None = None,
    config: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Write welcome templates and subscription price. Does not send PPV DMs."""
    log = get_logger("money")
    cfg = config or load_config()
    owned_queue = queue is None
    queue = queue or JobQueue()
    client = client or FanvueClient()
    settings = cfg.get("money") or {}
    welcome = dict(settings.get("welcome") or {})
    price_cents = int(settings.get("subscription_price_cents") or 0)
    summary: dict[str, Any] = {"welcome": [], "price": None, "ppv": "skipped"}

    try:
        for trigger in WELCOME_TRIGGERS:
            text = str(welcome.get(trigger) or "").strip()
            if not text:
                continue
            key = _text_key(trigger, text)
            if not queue.claim("money", "welcome", key, {"trigger": trigger}):
                summary["welcome"].append(trigger)
                continue
            try:
                result = client.upsert_automated_message(trigger, text)
                queue.mark_done(key, result if isinstance(result, dict) else {"ok": True})
                summary["welcome"].append(trigger)
                log.info("set automated message %s", trigger)
            except (FanvueAuthError, FanvueApiError) as exc:
                queue.mark_error(key, str(exc))
                log.error("welcome %s failed: %s", trigger, exc)
                raise

        if price_cents >= 100:
            current = 0
            try:
                account = client.get_account()
                current = int(((account.get("account") or {}).get("subscriptionPrice") or 0))
            except (FanvueAuthError, FanvueApiError, TypeError, ValueError):
                current = 0
            if current == price_cents:
                summary["price"] = price_cents
            else:
                key = f"money:sub-price:{price_cents}"
                claimed = queue.claim("money", "price", key, {"cents": price_cents})
                if not claimed:
                    claimed = queue.retry_error(key)
                if claimed:
                    try:
                        result = client.update_subscription_price(price_cents)
                        queue.mark_done(key, result if isinstance(result, dict) else {"ok": True})
                        summary["price"] = price_cents
                        log.info("subscription price set to %s cents", price_cents)
                    except (FanvueAuthError, FanvueApiError) as exc:
                        queue.mark_error(key, str(exc))
                        log.error("price update failed: %s", exc)
                        raise
                else:
                    summary["price"] = price_cents
        return summary
    finally:
        if owned_queue:
            queue.close()


def run(client: FanvueClient | None = None, queue: JobQueue | None = None) -> dict[str, Any]:
    """Phase 1+ MoneyBot. PPV DMs stay off under min_subscribers_for_ppv."""
    log = get_logger("money")
    config = load_config()
    allowed, reason = agent_allowed("money", config)
    if not allowed:
        log.info(reason)
        return {"skipped": True, "reason": reason}

    owned_queue = queue is None
    queue = queue or JobQueue()
    client = client or FanvueClient()
    min_ppv = int((config.get("money") or {}).get("min_subscribers_for_ppv") or 5)
    try:
        summary = install_account_setup(client=client, queue=queue, config=config)
        account = client.get_account()
        subscribers = int(((account.get("account") or {}).get("fans") or {}).get("subscribers") or 0)
        log.info("subscribers=%s (PPV floor is %s)", subscribers, min_ppv)
        if subscribers < min_ppv:
            summary["ppv"] = "skipped"
            log.info(
                "Skipping PPV campaigns — %s subscribers is below the floor of %s.",
                subscribers,
                min_ppv,
            )
        else:
            summary["ppv"] = "eligible"
            log.info(
                "PPV DMs are allowed now, but this run does not blast mass messages. "
                "Wall unlocks go through python run.py ppv."
            )
        return summary
    finally:
        if owned_queue:
            queue.close()
