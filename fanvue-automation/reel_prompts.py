"""Load and validate VEO 3 JSON reel prompts under prompts/reels/."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parent
REELS_DIR = ROOT / "prompts" / "reels"

REQUIRED_FIELDS = (
    "reel_id",
    "audience",
    "product_name",
    "product_type",
    "description",
    "brand_style",
    "style",
    "camera",
    "lighting",
    "location",
    "time_of_day",
    "atmosphere",
    "elements",
    "motion",
    "cta_motion",
    "ending",
    "text",
    "keywords",
    "lip_sync_line",
    "text_bubble",
    "outfit",
)

KNOWN_REELS = ("teaser", "ppv")

LIP_SYNC_LINE = "No, I don't think you understand. I'm obsessed."


class ReelPromptError(ValueError):
    """Raised when a reel JSON file is missing or invalid."""


def _path_for(name: str) -> Path:
    key = name.strip().lower()
    if key not in KNOWN_REELS:
        raise ReelPromptError(f"Unknown reel {name!r}. Use: {', '.join(KNOWN_REELS)}")
    return REELS_DIR / f"obsessed-outcome.{key}.json"


def load_reel(name: str) -> dict[str, Any]:
    """Return one reel prompt as a dict."""
    path = _path_for(name)
    if not path.is_file():
        raise ReelPromptError(f"Missing reel prompt: {path}")
    data = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(data, dict):
        raise ReelPromptError(f"{path.name} must be a JSON object")
    return data


def validate_reel(data: dict[str, Any]) -> list[str]:
    """Return human-readable errors. Empty list means the prompt is paste-ready."""
    errors: list[str] = []
    for field in REQUIRED_FIELDS:
        if field not in data or data[field] in (None, "", []):
            errors.append(f"missing {field}")
    keywords = data.get("keywords") or []
    if not isinstance(keywords, list) or "9:16" not in keywords:
        errors.append("keywords must include 9:16")
    if data.get("lip_sync_line") != LIP_SYNC_LINE:
        errors.append("lip_sync_line must match the notmonica audio")
    camera = str(data.get("camera") or "")
    if "9:16" not in camera and "vertical" not in camera.lower():
        errors.append("camera must be a vertical 9:16 shot")
    elements = data.get("elements")
    if not isinstance(elements, list) or len(elements) < 3:
        errors.append("elements needs at least 3 beats")
    return errors


def paste_text(data: dict[str, Any]) -> str:
    """Pretty JSON for VEO 3 / Flow / OpenArt."""
    return json.dumps(data, indent=2, ensure_ascii=False) + "\n"


def public_teaser_is_safe(data: dict[str, Any]) -> bool:
    """Phase 0 public file must stay out of lingerie/bikini territory."""
    if data.get("audience") != "followers-and-subscribers":
        return True
    blob = " ".join(
        [
            str(data.get("outfit") or ""),
            str(data.get("description") or ""),
            " ".join(str(k) for k in (data.get("keywords") or [])),
        ]
    ).lower()
    blocked = ("bikini", "lingerie", "thong", "nude")
    return not any(word in blob for word in blocked)
