"""Daily per-agent log files: logs/YYYY-MM-DD_agentname.log."""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from pathlib import Path

LOG_DIR = Path(__file__).resolve().parent / "logs"


def get_logger(agent_name: str) -> logging.Logger:
    """Return a logger that writes to today's agent log file."""
    LOG_DIR.mkdir(parents=True, exist_ok=True)
    day = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    path = LOG_DIR / f"{day}_{agent_name}.log"
    logger = logging.getLogger(f"fanvue.{agent_name}")
    logger.setLevel(logging.INFO)
    if not any(
        isinstance(handler, logging.FileHandler) and getattr(handler, "baseFilename", "") == str(path)
        for handler in logger.handlers
    ):
        handler = logging.FileHandler(path, encoding="utf-8")
        handler.setFormatter(logging.Formatter("%(asctime)s %(levelname)s %(message)s"))
        logger.addHandler(handler)
        stream = logging.StreamHandler()
        stream.setFormatter(logging.Formatter("%(asctime)s %(levelname)s %(message)s"))
        logger.addHandler(stream)
    logger.propagate = False
    return logger
