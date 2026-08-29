"""Write /share and /kit copy to disk so the owner can save it without Telegram."""

from __future__ import annotations

from pathlib import Path
from typing import Any

from config_loader import ROOT
from social_kit import format_setup, group_sets
from telegram_notify import format_share

EXPORT_DIR = ROOT / "share_kit"


def default_payload() -> dict[str, Any]:
    """Offline scoreboard when Fanvue tokens are missing on this machine."""
    return {
        "handle": "funny-kite-83",
        "public_url": "https://www.fanvue.com/funny-kite-83",
        "trial_url": (
            "https://www.fanvue.com/funny-kite-83"
            "?free_trial=b31468d1-0986-402f-9915-e7015e933c21"
        ),
        "trial_used": 0,
        "trial_max": 10,
        "trial_days": 7,
        "subscribers": 0,
        "followers": 0,
        "next_milestone": 10,
        "posts_listed": "?",
        "teaser_captions": [
            "hi, it's me — more on the page if you want it",
            "garden light, come say hi",
            "kitchen tea and a quiet morning",
        ],
        "video_count": 0,
        "note": "Offline kit. Fanvue tokens are not on this Cloud Agent.",
    }


def load_progress_payload() -> dict[str, Any]:
    """Merge progress.json onto the offline defaults when the file exists."""
    payload = default_payload()
    path = ROOT / "progress.json"
    if not path.exists():
        return payload
    try:
        data = __import__("json").loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return payload
    if isinstance(data, dict):
        payload.update({k: v for k, v in data.items() if v is not None})
    return payload


def write_share(payload: dict[str, Any] | None = None, dest: Path | None = None) -> Path:
    """Write the copy-paste share kit. Does not post anywhere."""
    data = dict(payload or load_progress_payload())
    folder = dest or EXPORT_DIR
    folder.mkdir(parents=True, exist_ok=True)
    path = folder / "SHARE.txt"
    path.write_text(format_share(data) + "\n", encoding="utf-8")
    return path


def write_kit(
    images: list[Path] | None = None,
    payload: dict[str, Any] | None = None,
    dest: Path | None = None,
) -> Path:
    """Write bio + set list. Photos stay in content_bank/; this is the caption sheet."""
    from agents.content_agent import list_bank_images
    from config_loader import load_config

    data = dict(payload or load_progress_payload())
    folder = dest or EXPORT_DIR
    folder.mkdir(parents=True, exist_ok=True)
    bank = images if images is not None else list_bank_images(load_config())
    sets = group_sets(bank)
    lines = [format_setup(data), "", "Sets on disk (save from content_bank/, clothes on):"]
    if not sets:
        lines.append("- (empty on this machine — photos are gitignored; use a VM that has the bank)")
    for spec in sets:
        names = ", ".join(path.name for path in spec["files"])
        lines.append(f"- {spec['title']} ({len(spec['files'])}): {names}")
    path = folder / "KIT.txt"
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")
    return path
