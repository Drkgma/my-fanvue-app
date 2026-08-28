"""Starter PPV catalog — match dropped files to priced wall posts."""

from __future__ import annotations

from pathlib import Path
from typing import Any

import yaml

from config_loader import ROOT, load_config

CATALOG_PATH = ROOT / "ppv_catalog.yaml"
SCRIPTS_PATH = ROOT / "ppv_scripts.yaml"
IMAGE_SUFFIXES = {".jpg", ".jpeg", ".png", ".webp", ".gif"}
VIDEO_SUFFIXES = {".mp4", ".mov", ".m4v", ".webm"}
MEDIA_SUFFIXES = IMAGE_SUFFIXES | VIDEO_SUFFIXES


def media_type_for(path: Path) -> str:
    """Fanvue mediaType: image or video."""
    return "video" if path.suffix.lower() in VIDEO_SUFFIXES else "image"


def _normalize_item(row: dict[str, Any]) -> dict[str, Any] | None:
    if not isinstance(row, dict) or not row.get("id"):
        return None
    item = dict(row)
    item["id"] = str(item["id"])
    item["price_cents"] = max(300, int(item.get("price_cents") or 300))
    item["filename"] = str(item.get("filename") or item["id"])
    item["kind"] = str(item.get("kind") or "pic")
    item["label"] = str(item.get("label") or item["id"])
    item["caption"] = str(item.get("caption") or "unlock")
    return item


def load_starter(path: Path | None = None) -> list[dict[str, Any]]:
    """16-item new-account singles from ppv_catalog.yaml."""
    dest = path or CATALOG_PATH
    if not dest.exists():
        return []
    loaded = yaml.safe_load(dest.read_text(encoding="utf-8")) or {}
    rows = loaded.get("items") if isinstance(loaded, dict) else loaded
    if not isinstance(rows, list):
        return []
    out: list[dict[str, Any]] = []
    for row in rows:
        item = _normalize_item(row)
        if item:
            item["pack"] = "starter"
            out.append(item)
    return out


def load_scripts(path: Path | None = None) -> list[dict[str, Any]]:
    """Film-it-yourself PPV script packs."""
    dest = path or SCRIPTS_PATH
    if not dest.exists():
        return []
    loaded = yaml.safe_load(dest.read_text(encoding="utf-8")) or {}
    rows = loaded.get("scripts") if isinstance(loaded, dict) else loaded
    if not isinstance(rows, list):
        return []
    out: list[dict[str, Any]] = []
    for row in rows:
        if not isinstance(row, dict) or not row.get("id"):
            continue
        script = dict(row)
        script["id"] = str(script["id"])
        script["title"] = str(script.get("title") or script["id"])
        script["bundle_price_cents"] = max(300, int(script.get("bundle_price_cents") or 300))
        shots: list[dict[str, Any]] = []
        for shot in script.get("shots") or []:
            item = _normalize_item(shot)
            if not item:
                continue
            item["pack"] = script["id"]
            item["script_title"] = script["title"]
            shots.append(item)
        script["shots"] = shots
        out.append(script)
    return out


def load_catalog(path: Path | None = None) -> list[dict[str, Any]]:
    """Starter singles plus flattened script shots (all priced wall SKUs)."""
    items = load_starter(path)
    for script in load_scripts():
        items.extend(script["shots"])
    return items


def _bank_dir(config: dict[str, Any] | None = None) -> Path:
    cfg = config or load_config()
    relative = Path(str((cfg.get("content") or {}).get("ppv_bank_dir") or "ppv_bank"))
    return relative if relative.is_absolute() else ROOT / relative


def list_ppv_files(config: dict[str, Any] | None = None) -> list[Path]:
    """Return media files in the PPV bank (not the public teaser bank)."""
    folder = _bank_dir(config)
    if not folder.exists():
        return []
    return sorted(
        path
        for path in folder.iterdir()
        if path.is_file() and path.suffix.lower() in MEDIA_SUFFIXES
    )


def match_item(path: Path, items: list[dict[str, Any]]) -> dict[str, Any] | None:
    """Match a dropped file to a catalog row by id / filename prefix."""
    stem = path.stem.lower()
    for item in items:
        token = str(item.get("filename") or item["id"]).lower()
        if stem == token or stem.startswith(f"{token}-") or stem.startswith(f"{token}_"):
            kind = str(item.get("kind") or "pic")
            is_video = path.suffix.lower() in VIDEO_SUFFIXES
            if kind == "video" and not is_video:
                continue
            if kind == "pic" and is_video:
                continue
            return item
    return None


def inventory(config: dict[str, Any] | None = None) -> dict[str, Any]:
    """Ready vs missing SKUs. Unmatched files are listed, not posted."""
    items = load_catalog()
    files = list_ppv_files(config)
    ready: list[dict[str, Any]] = []
    used: set[Path] = set()
    for item in items:
        hit: Path | None = None
        for path in files:
            if path in used:
                continue
            if match_item(path, [item]):
                hit = path
                break
        if hit is not None:
            used.add(hit)
            ready.append({"item": item, "path": hit})
    missing = [item["id"] for item in items if item["id"] not in {row["item"]["id"] for row in ready}]
    unmatched = [path.name for path in files if path not in used]
    packs: list[dict[str, Any]] = []
    ready_ids = {row["item"]["id"] for row in ready}
    for script in load_scripts():
        shot_ids = [shot["id"] for shot in script["shots"]]
        have = sum(1 for sid in shot_ids if sid in ready_ids)
        packs.append(
            {
                "id": script["id"],
                "title": script["title"],
                "ready": have,
                "total": len(shot_ids),
                "bundle_price_cents": script["bundle_price_cents"],
            }
        )
    starter_ids = {item["id"] for item in load_starter()}
    return {
        "total": len(items),
        "ready": ready,
        "missing": missing,
        "unmatched": unmatched,
        "bank": len(files),
        "starter_total": len(starter_ids),
        "starter_ready": sum(1 for sid in starter_ids if sid in ready_ids),
        "packs": packs,
    }


def next_shoot_list(limit: int = 8, config: dict[str, Any] | None = None) -> list[dict[str, Any]]:
    """First missing shots to film. Filenames only — no generated media."""
    stock = inventory(config)
    missing = set(stock["missing"])
    out: list[dict[str, Any]] = []
    for item in load_catalog():
        if item["id"] not in missing:
            continue
        ext = "mp4" if item["kind"] == "video" else "jpg"
        out.append(
            {
                "id": item["id"],
                "label": item["label"],
                "filename": f"{item['filename']}.{ext}",
                "pack": item.get("script_title") or item.get("pack") or "starter",
                "price_cents": item["price_cents"],
            }
        )
        if len(out) >= limit:
            break
    return out


def menu_text(items: list[dict[str, Any]] | None = None) -> str:
    """Short DM/welcome menu. Starter singles + script pack titles."""
    rows = items if items is not None else load_starter()
    pics = [row["label"] for row in rows if row.get("kind") == "pic"]
    videos = [row["label"] for row in rows if row.get("kind") == "video"]
    parts = ["Menu:"]
    if pics:
        parts.append("Pics — " + ", ".join(pics))
    if videos:
        parts.append("Clips — " + ", ".join(videos))
    titles = [script["title"] for script in load_scripts()]
    if titles:
        parts.append("Scripts — " + ", ".join(titles))
    parts.append("Ask for a name and I will send the unlock.")
    return " ".join(parts)
