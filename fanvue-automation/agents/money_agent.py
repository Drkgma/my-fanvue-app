"""MoneyBot — welcome automations and a sane sub price. No mass PPV under 5 subs."""

from __future__ import annotations

from typing import Any

from agent_log import get_logger
from config_loader import agent_allowed, load_config
from fanvue_client import FanvueApiError, FanvueAuthError, FanvueClient
from jobs import JobQueue

WELCOME_TRIGGERS = ("new_follower", "new_subscriber", "first_message_reply")


def run(client: FanvueClient | None = None, queue: JobQueue | None = None) -> dict[str, Any]:
    """Configure welcome messages and optionally set subscription price once."""
    log = get_logger("money")
    config = load_config()
    allowed, reason = agent_allowed("money", config)
    if not allowed:
        log.info(reason)
        return {"skipped": True, "reason": reason}

    owned_queue = queue is None
    queue = queue or JobQueue()
    client = client or FanvueClient()
    settings = config["money"]
    welcome = dict(settings.get("welcome") or {})
    price_cents = int(settings.get("subscription_price_cents") or 0)
    min_ppv = int(settings.get("min_subscribers_for_ppv") or 5)
    summary: dict[str, Any] = {"welcome": [], "price": None, "ppv": "skipped"}

    try:
        account = client.get_account()
        subscribers = int(((account.get("account") or {}).get("fans") or {}).get("subscribers") or 0)
        log.info("subscribers=%s (PPV floor is %s)", subscribers, min_ppv)

        for trigger in WELCOME_TRIGGERS:
            text = str(welcome.get(trigger) or "").strip()
            if not text:
                continue
            key = f"money:welcome:{trigger}:{hash(text)}"
            if not queue.claim("money", "welcome", key, {"trigger": trigger}):
                continue
            try:
                result = client.upsert_automated_message(trigger, text, price=0)
                queue.mark_done(key, result)
                summary["welcome"].append(trigger)
                log.info("set automated message %s", trigger)
            except (FanvueAuthError, FanvueApiError) as exc:
                queue.mark_error(key, str(exc))
                log.error("welcome %s failed: %s", trigger, exc)
                raise

        if price_cents >= 100:
            key = f"money:sub-price:{price_cents}"
            if queue.claim("money", "price", key, {"cents": price_cents}):
                try:
                    result = client.update_subscription_price(price_cents)
                    queue.mark_done(key, result if isinstance(result, dict) else {"ok": True})
                    summary["price"] = price_cents
                    log.info("subscription price set to %s cents", price_cents)
                except (FanvueAuthError, FanvueApiError) as exc:
                    queue.mark_error(key, str(exc))
                    log.error("price update failed: %s", exc)
                    raise

        if subscribers < min_ppv:
            log.info(
                "Skipping PPV campaigns — %s subscribers is below the floor of %s. "
                "Welcome messages are enough until the inbox is busy.",
                subscribers,
                min_ppv,
            )
        else:
            summary["ppv"] = "eligible"
            log.info("PPV is allowed now, but this run does not blast mass messages.")
        return summary
    finally:
        if owned_queue:
            queue.close()
