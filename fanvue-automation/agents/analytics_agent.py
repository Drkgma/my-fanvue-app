"""AnalyticsAgent — Phase 0 scoreboard: subs, followers, posts, earnings."""

from __future__ import annotations

from typing import Any

from agent_log import get_logger
from config_loader import agent_allowed, load_config
from fanvue_client import FanvueAuthError, FanvueClient
from jobs import JobQueue, utc_now


def snapshot(account: dict[str, Any], posts: dict[str, Any]) -> dict[str, Any]:
    """Pull the 1→10 numbers that actually matter this month."""
    fans = (account.get("account") or {}).get("fans") or {}
    earnings = (account.get("account") or {}).get("earnings") or {}
    post_rows = list(posts.get("data") or [])
    return {
        "at": utc_now(),
        "handle": account.get("handle"),
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
            posts = client.list_posts(size=15)
        except Exception as exc:  # noqa: BLE001 — posts are optional at phase 0
            log.info("posts unavailable (%s); continuing with account only", exc)
            posts = {"data": []}
        data = snapshot(account, posts)
        key = f"analytics:snapshot:{data['at'][:10]}"
        if queue.claim("analytics", "snapshot", key, data):
            queue.mark_done(key, data)
        log.info(
            "scoreboard @%s subs=%s/%s followers=%s earnings_cents=%s posts=%s",
            data.get("handle"),
            data["subscribers"],
            data["next_milestone"],
            data["followers"],
            data["earnings_cents"],
            data["posts_listed"],
        )
        if data["subscribers"] < 10:
            log.info("Stay on Phase 0: auth, 20 images, 5 teasers. Do not buy ads.")
        return data
    except FanvueAuthError:
        log.error("Auth is broken. Fix OAuth before measuring anything else.")
        raise
    finally:
        if owned_queue:
            queue.close()
