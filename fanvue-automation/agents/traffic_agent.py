"""TrafficAgent — gated until Phase 2. Driving traffic into a dead inbox is waste."""

from __future__ import annotations

from typing import Any

from agent_log import get_logger
from config_loader import agent_allowed, load_config


def run() -> dict[str, Any]:
    """Refuse to post teasers off-platform until ChatMate is live and phase >= 2."""
    log = get_logger("traffic")
    config = load_config()
    allowed, reason = agent_allowed("traffic", config)
    if not allowed:
        log.info(reason)
        return {"skipped": True, "reason": reason}
    message = (
        "TrafficAgent is unblocked in config, but off-platform posting is still "
        "Phase 2 work. Get to 10 subscribers with Fanvue teasers + DMs first."
    )
    log.info(message)
    return {"skipped": True, "reason": message}
