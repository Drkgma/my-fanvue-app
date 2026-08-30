"""Phase 0 hands-off setup. Welcome DMs + sub price. No ChatMate, no PPV blasts, no traffic."""

from __future__ import annotations

from typing import Any

from agent_log import get_logger
from agents.money_agent import ensure_trial_link, install_account_setup
from fanvue_client import FanvueClient


def run(**kwargs: Any) -> dict[str, Any]:
    """Install Fanvue welcome templates now. Does not reply to chats or post off-platform."""
    log = get_logger("bootstrap")
    result = install_account_setup(**kwargs)
    client = kwargs.get("client") or FanvueClient()
    trial = None
    try:
        trial = ensure_trial_link(client)
    except Exception as exc:  # noqa: BLE001 — welcome DMs still count if trials fail
        log.info("trial link skipped: %s", exc)
    if trial:
        result["trial_url"] = trial.get("url")
        result["trial_used"] = trial.get("usedCount")
        result["trial_max"] = trial.get("maxUsages")
        result["trial_days"] = trial.get("trialDurationDays")
    result["note"] = (
        "Welcome DMs, $9.99, and a 7-day free trial (10 uses) are on Fanvue. "
        "ChatMate, PPV DMs, ads, and TrafficAgent stay off until 10 subscribers. "
        "I cannot text your friends or film a clothed intro video from this VM."
    )
    log.info("bootstrap welcome=%s price=%s trial=%s", result.get("welcome"), result.get("price"), result.get("trial_url"))
    return result
