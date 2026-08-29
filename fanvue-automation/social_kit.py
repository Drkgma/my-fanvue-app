"""Clothed teaser sets for the creator to save and post on their own socials.

Does not post to Reddit, X, TikTok, or Fanvue. Does not send identity sheets,
empty rooms, or PPV/nudes. TrafficAgent stays off.
"""

from __future__ import annotations

import time
from pathlib import Path
from typing import Any

from agent_log import get_logger
from agents.content_agent import list_bank_images
from config_loader import load_config
from telegram_notify import send, send_media_group

ALBUM_MAX = 10
PUBLIC_PAGE = "https://www.fanvue.com/funny-kite-83"
TRIAL_URL = f"{PUBLIC_PAGE}?free_trial=b31468d1-0986-402f-9915-e7015e933c21"

SET_SPECS = (
    {
        "id": "glam",
        "prefix": "glam-",
        "title": "Set 1 — Glam close-ups",
        "use": "IG/Snap profile photo and highlight cover. Clothes on.",
    },
    {
        "id": "life",
        "prefix": "life-",
        "title": "Set 2 — Life / outdoor",
        "use": "Stories and feed. Same photos for USA and international.",
    },
    {
        "id": "casual",
        "prefix": "casual-",
        "title": "Set 3 — Casual indoor",
        "use": "Feed posts. Kitchen / sofa / bedroom. Clothes on.",
    },
    {
        "id": "looks-b",
        "prefix": "body2-",
        "title": "Set 4 — Looks (sundress, white shirt, cafe)",
        "use": "Carousel. Clothes on.",
    },
    {
        "id": "looks-a",
        "prefix": "body-",
        "title": "Set 5 — Looks (sweater, street, vanity)",
        "use": "Carousel. Clothes on.",
    },
)


def matches_prefix(name: str, prefix: str) -> bool:
    """body- must not swallow body2- files."""
    if prefix == "body-":
        return name.startswith("body-") and not name.startswith("body2-")
    return name.startswith(prefix)


def chunk_paths(paths: list[Path], size: int = ALBUM_MAX) -> list[list[Path]]:
    """Telegram albums hold 2–10 items. Singles stay as a one-photo group."""
    if size < 1:
        return [list(paths)]
    return [paths[i : i + size] for i in range(0, len(paths), size)]


def group_sets(images: list[Path]) -> list[dict[str, Any]]:
    """Bucket bank files into named social sets. Unmatched files are skipped."""
    ordered = sorted(images, key=lambda path: path.name)
    sets: list[dict[str, Any]] = []
    used: set[str] = set()
    for spec in SET_SPECS:
        files = [path for path in ordered if matches_prefix(path.name, str(spec["prefix"]))]
        if not files:
            continue
        used.update(path.name for path in files)
        sets.append({**spec, "files": files})
    leftover = [path for path in ordered if path.name not in used]
    if leftover:
        sets.append(
            {
                "id": "extra",
                "prefix": "",
                "title": "Set extra — leftover clothed teasers",
                "use": "Feed. Clothes on.",
                "files": leftover,
            }
        )
    return sets


def format_setup(payload: dict[str, Any] | None = None) -> str:
    """Copy-paste kit: bio, captions, trial. Not a Reddit/X post."""
    data = payload or {}
    trial = str(data.get("trial_url") or TRIAL_URL)
    captions = list(data.get("teaser_captions") or [])
    if not captions:
        captions = [
            "hi, it's me — more on the page if you want it",
            "garden light, come say hi",
            "kitchen tea and a quiet morning",
        ]
    lines = [
        "Funny Kite — social setup kit",
        "Clothes-on teasers only. Save from Telegram, post on YOUR IG / Snap / WhatsApp.",
        "USA and international use the same link. I am not posting to Reddit, X, or TikTok.",
        "",
        "BIO (one paste):",
        captions[0],
        trial,
        "",
        "Captions (rotate):",
    ]
    for caption in captions:
        lines.append(f"- {caption}")
    lines.extend(
        [
            "",
            "Sets in the next messages:",
            "1 Glam close-ups — profile / highlight",
            "2 Life / outdoor — stories + feed",
            "3 Casual indoor — feed",
            "4 Looks sundress / white shirt — carousel",
            "5 Looks sweater / street — carousel",
            "",
            "Long-press a photo → Save to camera roll → post on your account.",
            "No nudes off Fanvue. Reddit/X/ads stay off until 10 subscribers.",
            "Film a 15–30s clothed intro in Fanvue Settings after you paste the bio.",
        ]
    )
    return "\n".join(lines)


def album_caption(spec: dict[str, Any], trial_url: str, caption: str) -> str:
    """First photo in a Telegram album. 1024-char cap."""
    files = spec.get("files") or []
    text = (
        f"{spec.get('title')} ({len(files)})\n"
        f"{spec.get('use')}\n"
        f"{caption}\n"
        f"{trial_url}"
    )
    return text[:1024]


def run(payload: dict[str, Any] | None = None) -> dict[str, Any]:
    """Send setup copy + clothed albums to the creator Telegram chat."""
    log = get_logger("kit")
    config = load_config()
    data = dict(payload or {})
    data.setdefault("trial_url", TRIAL_URL)
    data.setdefault(
        "teaser_captions",
        list((config.get("content") or {}).get("teaser_captions") or []),
    )
    images = list_bank_images(config)
    sets = group_sets(images)
    summary: dict[str, Any] = {
        "bank": len(images),
        "sets": [
            {"id": spec["id"], "title": spec["title"], "count": len(spec["files"])}
            for spec in sets
        ],
        "albums": [],
        "intro": None,
        "note": "Sent to your Telegram. I did not post to Reddit or X.",
    }
    intro = send(format_setup(data))
    summary["intro"] = intro
    if not intro.get("ok"):
        log.error("kit intro failed: %s", intro.get("reason"))
        return summary

    trial = str(data.get("trial_url") or TRIAL_URL)
    captions = list(data.get("teaser_captions") or [])
    hook = captions[0] if captions else "hi, it's me — more on the page if you want it"
    for spec in sets:
        files: list[Path] = list(spec["files"])
        for index, group in enumerate(chunk_paths(files, ALBUM_MAX), start=1):
            title = spec["title"] if index == 1 else f"{spec['title']} ({index})"
            piece = {**spec, "title": title, "files": group}
            ping = send_media_group(group, caption=album_caption(piece, trial, hook))
            summary["albums"].append(
                {
                    "id": spec["id"],
                    "part": index,
                    "files": [path.name for path in group],
                    "telegram": ping,
                }
            )
            if not ping.get("ok"):
                log.error("album %s part %s failed: %s", spec["id"], index, ping.get("reason"))
            time.sleep(1.2)
    ok_albums = sum(1 for row in summary["albums"] if (row.get("telegram") or {}).get("ok"))
    log.info(
        "kit bank=%s albums_ok=%s/%s trial_sent=%s",
        len(images),
        ok_albums,
        len(summary["albums"]),
        bool(intro.get("ok")),
    )
    return summary
