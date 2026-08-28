"""Load phase-aware settings from config.yaml."""

from __future__ import annotations

from pathlib import Path
from typing import Any

import yaml

ROOT = Path(__file__).resolve().parent
REPO_ROOT = ROOT.parent
CONFIG_CANDIDATES = (REPO_ROOT / "config.yaml", ROOT / "config.yaml")

PHASE_MIN_AGENT = {
    "content": 0,
    "chat": 1,
    "money": 1,
    "traffic": 2,
    "analytics": 0,
}


class ConfigError(RuntimeError):
    """Raised when config.yaml is missing or invalid."""


def _default_config() -> dict[str, Any]:
    return {
        "phase": 0,
        "revenue_target": 5,
        "subscriber_target": 10,
        "focus": ["fix_auth", "upload_content", "schedule_posts"],
        "content": {
            "bank_dir": "content_bank",
            "ppv_bank_dir": "ppv_bank",
            "max_uploads_per_run": 20,
            "max_teasers_per_run": 5,
            "max_ppv_per_run": 3,
            "teaser_audience": "followers-and-subscribers",
            "ppv_audience": "followers-and-subscribers",
            "teaser_captions": ["New photos just dropped."],
        },
        "chat": {"enabled": False, "max_replies_per_run": 10, "reply_template": ""},
        "money": {
            "enabled": False,
            "subscription_price_cents": 999,
            "min_subscribers_for_ppv": 5,
            "welcome": {},
        },
        "traffic": {"enabled": False},
        "analytics": {"enabled": True},
    }


def load_config(path: Path | None = None) -> dict[str, Any]:
    """Return merged config. Missing file → Phase 0 defaults."""
    merged = _default_config()
    chosen = path
    if chosen is None:
        chosen = next((p for p in CONFIG_CANDIDATES if p.exists()), None)
    if chosen is None or not Path(chosen).exists():
        return merged
    with chosen.open(encoding="utf-8") as handle:
        loaded = yaml.safe_load(handle) or {}
    if not isinstance(loaded, dict):
        raise ConfigError("config.yaml must be a mapping")
    merged.update(loaded)
    for key in ("content", "chat", "money", "traffic", "analytics"):
        if isinstance(loaded.get(key), dict):
            section = _default_config()[key]
            section.update(loaded[key])
            merged[key] = section
    merged["phase"] = int(merged.get("phase") or 0)
    return merged


def agent_allowed(agent: str, config: dict[str, Any] | None = None) -> tuple[bool, str]:
    """Return whether *agent* may run in the current phase."""
    cfg = config or load_config()
    phase = int(cfg.get("phase") or 0)
    minimum = PHASE_MIN_AGENT.get(agent, 99)
    if phase < minimum:
        return (
            False,
            f"{agent} needs phase {minimum}+ (current phase {phase}). "
            "Hit 10 subscribers before adding more surface area.",
        )
    section = cfg.get(agent) if isinstance(cfg.get(agent), dict) else {}
    if agent in ("chat", "money", "traffic") and not section.get("enabled", False):
        if phase >= minimum:
            return (
                False,
                f"{agent} is gated off in config.yaml. Set {agent}.enabled: true "
                f"after you finish Phase 0 auth + content.",
            )
        return False, f"{agent} is disabled."
    return True, ""
