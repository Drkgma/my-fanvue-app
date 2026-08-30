"""AnalyticsAgent — Phase 0 scoreboard: subs, followers, posts, earnings."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from agent_log import get_logger
from config_loader import ROOT, agent_allowed, load_config
from fanvue_client import FanvueAuthError, FanvueClient
from jobs import JobQueue, utc_now
from ppv_catalog import inventory as ppv_inventory
from telegram_notify import format_share, send

IMAGE_SUFFIXES = {".jpg", ".jpeg", ".png", ".webp", ".gif"}
PROGRESS_PATH = ROOT / "progress.json"


def public_page_url(handle: str | None) -> str:
    """Public creator page. Handle only — never tokens."""
    slug = (handle or "funny-kite-83").lstrip("@")
    return f"https://www.fanvue.com/{slug}"


def write_progress(data: dict[str, Any], path: Path | None = None) -> Path:
    """Persist a gitignored scoreboard the desk can show without a browser login."""
    dest = path or PROGRESS_PATH
    dest.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")
    return dest


def _bank_count(config: dict[str, Any]) -> int:
    relative = Path(str((config.get("content") or {}).get("bank_dir") or "content_bank"))
    folder = relative if relative.is_absolute() else ROOT / relative
    if not folder.exists():
        return 0
    return sum(1 for path in folder.iterdir() if path.is_file() and path.suffix.lower() in IMAGE_SUFFIXES)


def count_listed_posts(client: FanvueClient, page_size: int = 50, max_pages: int = 20) -> int:
    """Page through GET /posts so the scoreboard is not stuck at the first 15."""
    total = 0
    for page in range(1, max_pages + 1):
        posts = client.list_posts(page=page, size=page_size)
        rows = list(posts.get("data") or [])
        total += len(rows)
        pagination = posts.get("pagination") or {}
        if pagination.get("hasMore") is True and rows:
            continue
        break
    return total


def snapshot(account: dict[str, Any], posts: dict[str, Any]) -> dict[str, Any]:
    """Pull the 1→10 numbers that actually matter this month."""
    fans = (account.get("account") or {}).get("fans") or {}
    earnings = (account.get("account") or {}).get("earnings") or {}
    post_rows = list(posts.get("data") or [])
    handle = account.get("handle")
    return {
        "at": utc_now(),
        "handle": handle,
        "public_url": public_page_url(str(handle) if handle else None),
        "subscribers": int(fans.get("subscribers") or 0),
        "followers": int(fans.get("followers") or 0),
        "earnings_cents": int(earnings.get("total") or 0),
        "posts_listed": len(post_rows),
        "next_milestone": 10,
    }


def run(client: FanvueClient | None = None, queue: JobQueue | None = None) -> dict[str, Any]:
    """Record one daily snapshot. Does not A/B test; there is nothing to A/B yet."""
    log = get_logger("analytics")
    config = load_config()
    allowed, reason = agent_allowed("analytics", config)
    if not allowed:
        log.info(reason)
        return {"skipped": True, "reason": reason}

    owned_queue = queue is None
    queue = queue or JobQueue()
    client = client or FanvueClient()
    try:
        account = client.get_account()
        try:
            listed = count_listed_posts(client)
            posts = {"data": [None] * listed}
        except Exception as exc:  # noqa: BLE001 — posts are optional at phase 0
            log.info("posts unavailable (%s); continuing with account only", exc)
            posts = {"data": []}
        data = snapshot(account, posts)
        data["teasers_posted"] = queue.count("content", "teaser")
        data["leftover_teasers"] = queue.leftover_teaser_count()
        data["bank"] = _bank_count(config)
        stock = ppv_inventory(config)
        data["ppv_ready"] = len(stock["ready"])
        data["ppv_total"] = stock["total"]
        data["ppv_missing"] = stock["missing"]
        data["ppv_posted"] = queue.count("ppv", "post")
        data["ppv_starter_ready"] = stock.get("starter_ready")
        data["ppv_starter_total"] = stock.get("starter_total")
        data["ppv_packs"] = stock.get("packs") or []
        data["sell_packs"] = stock.get("sell_packs") or []
        try:
            me = client.get_me()
        except Exception as exc:  # noqa: BLE001 — scoreboard still works without /users/me extras
            log.info("profile extras unavailable (%s)", exc)
            me = {}
        counts = me.get("contentCounts") or {}
        data["discoverable"] = bool(me.get("isDiscoverable")) if me else None
        data["curated"] = bool(me.get("isInCuratedSection")) if me else None
        data["video_count"] = int(counts.get("videoCount") or 0) if me else None
        data["likes"] = int(me.get("likesCount") or 0) if me else None
        try:
            trials = (client.list_free_trial_links() or {}).get("data") or []
            open_trial = next(
                (
                    row
                    for row in trials
                    if isinstance(row, dict)
                    and row.get("url")
                    and (
                        row.get("maxUsages") is None
                        or int(row.get("usedCount") or 0) < int(row.get("maxUsages") or 0)
                    )
                ),
                None,
            )
            if open_trial:
                data["trial_url"] = open_trial.get("url")
                data["trial_used"] = open_trial.get("usedCount")
                data["trial_max"] = open_trial.get("maxUsages")
                data["trial_days"] = open_trial.get("trialDurationDays")
        except Exception as exc:  # noqa: BLE001
            log.info("trial links unavailable (%s)", exc)
        if data["followers"] == 0:
            bits = [
                "0 followers: text the 7-day free trial to 10 people you already talk to.",
            ]
            if data.get("video_count") == 0:
                bits.append(
                    "Film a 15–30s clothed intro video in Fanvue Settings — Discover places intro videos."
                )
            bits.append("Ads and TrafficAgent stay off until 10 subscribers.")
            data["share_note"] = " ".join(bits)
        write_progress(data)
        key = f"analytics:snapshot:{data['at'][:10]}"
        if queue.claim("analytics", "snapshot", key, data):
            queue.mark_done(key, data)
        log.info(
            "scoreboard @%s subs=%s/%s followers=%s earnings_cents=%s posts=%s leftover=%s",
            data.get("handle"),
            data["subscribers"],
            data["next_milestone"],
            data["followers"],
            data["earnings_cents"],
            data["posts_listed"],
            data["leftover_teasers"],
        )
        if data["subscribers"] < 10:
            log.info("Stay on Phase 0. Share %s — do not buy ads.", data.get("public_url"))
            nudge_key = f"analytics:share-nudge:{data['at'][:10]}"
            if queue.claim("analytics", "share-nudge", nudge_key, {"url": data.get("public_url")}):
                captions = list((config.get("content") or {}).get("teaser_captions") or [])
                ping = send(format_share({**data, "teaser_captions": captions}))
                queue.mark_done(nudge_key, {"telegram": ping})
                data["share_nudge"] = ping
        return data
    except FanvueAuthError:
        log.error("Auth is broken. Fix OAuth before measuring anything else.")
        raise
    finally:
        if owned_queue:
            queue.close()
