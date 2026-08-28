"""Phase 0 hands-off setup. Welcome DMs + sub price. No ChatMate, no PPV blasts, no traffic."""

from __future__ import annotations

from typing import Any

from agent_log import get_logger
from agents.money_agent import install_account_setup


def run(**kwargs: Any) -> dict[str, Any]:
    """Install Fanvue welcome templates now. Does not reply to chats or post off-platform."""
    log = get_logger("bootstrap")
    result = install_account_setup(**kwargs)
    result["note"] = (
        "Welcome DMs and the $9.99 price are on Fanvue. ChatMate, PPV DMs, ads, "
        "and TrafficAgent stay off until 10 subscribers. I cannot text your friends "
        "or film a clothed intro video from this VM."
    )
    log.info("bootstrap welcome=%s price=%s", result.get("welcome"), result.get("price"))
    return result
