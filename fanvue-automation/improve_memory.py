"""Gitignored memory for the improve loop. Snapshots + experiment scores."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from config_loader import ROOT

MEMORY_PATH = ROOT / "improve_memory.json"
MAX_SNAPSHOTS = 48
MAX_EXPERIMENTS = 80


def empty_memory() -> dict[str, Any]:
    return {
        "snapshots": [],
        "experiments": [],
        "variant_scores": {},
        "open_experiment": None,
    }


def load_memory(path: Path | None = None) -> dict[str, Any]:
    dest = path or MEMORY_PATH
    try:
        payload = json.loads(dest.read_text(encoding="utf-8"))
    except (OSError, ValueError, TypeError):
        return empty_memory()
    if not isinstance(payload, dict):
        return empty_memory()
    merged = empty_memory()
    merged.update(payload)
    if not isinstance(merged.get("snapshots"), list):
        merged["snapshots"] = []
    if not isinstance(merged.get("experiments"), list):
        merged["experiments"] = []
    if not isinstance(merged.get("variant_scores"), dict):
        merged["variant_scores"] = {}
    return merged


def save_memory(memory: dict[str, Any], path: Path | None = None) -> Path:
    dest = path or MEMORY_PATH
    payload = dict(memory)
    payload["snapshots"] = list(payload.get("snapshots") or [])[-MAX_SNAPSHOTS:]
    payload["experiments"] = list(payload.get("experiments") or [])[-MAX_EXPERIMENTS:]
    dest.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    return dest
