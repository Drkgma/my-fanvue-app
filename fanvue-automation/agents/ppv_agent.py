"""Post priced wall items from ppv_bank/. Does not generate nudes. No PPV DMs."""

from __future__ import annotations

import hashlib
from pathlib import Path
from typing import Any

from agent_log import get_logger
from config_loader import agent_allowed, load_config
from fanvue_client import FanvueApiError, FanvueAuthError, FanvueClient
from jobs import JobQueue
from ppv_catalog import inventory, media_type_for


def _file_key(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def run(client: FanvueClient | None = None, queue: JobQueue | None = None) -> dict[str, Any]:
    """Upload matched catalog files and post them as paid wall unlocks."""
    log = get_logger("ppv")
    config = load_config()
    allowed, reason = agent_allowed("content", config)
    if not allowed:
        log.info(reason)
        return {"skipped": True, "reason": reason}

    owned_queue = queue is None
    queue = queue or JobQueue()
    client = client or FanvueClient()
    settings = config.get("content") or {}
    max_posts = int(settings.get("max_ppv_per_run") or 3)
    audience = str(settings.get("ppv_audience") or "followers-and-subscribers")
    stock = inventory(config)
    summary: dict[str, Any] = {
        "catalog_total": stock["total"],
        "ready": len(stock["ready"]),
        "missing": stock["missing"],
        "unmatched": stock["unmatched"],
        "uploaded": [],
        "posted": [],
        "skipped": [],
        "note": "",
    }

    try:
        if not stock["ready"]:
            summary["note"] = (
                "PPV bank is empty. Drop your own pics/clips into ppv_bank/ named "
                "after the catalog (lingerie.jpg, shower.mp4). I will not generate those shots."
            )
            log.info(summary["note"])
            return summary

        posted = 0
        for row in stock["ready"]:
            if posted >= max_posts:
                break
            item = row["item"]
            path: Path = row["path"]
            digest = _file_key(path)
            sku = item["id"]
            upload_key = f"ppv:upload:{sku}:{digest}"
            post_key = f"ppv:post:{sku}:{digest}"
            media_uuid = ""
            if queue.has_done(upload_key):
                for done in queue.done_results("ppv", "upload"):
                    if done.get("sku") == sku and done.get("digest") == digest:
                        media_uuid = str(done.get("media_uuid") or "")
                        break
            else:
                claimed = queue.claim("ppv", "upload", upload_key, {"file": path.name, "sku": sku})
                if not claimed and not queue.retry_error(upload_key):
                    summary["skipped"].append(sku)
                    continue
                try:
                    media_uuid = client.upload_file(path, media_type=media_type_for(path))
                    wait_s = 300 if media_type_for(path) == "video" else 120
                    client.wait_until_media_ready(media_uuid, timeout_s=wait_s)
                    queue.mark_done(
                        upload_key,
                        {"media_uuid": media_uuid, "file": path.name, "sku": sku, "digest": digest},
                    )
                    summary["uploaded"].append({"sku": sku, "file": path.name, "media_uuid": media_uuid})
                    log.info("uploaded PPV %s -> %s", sku, media_uuid)
                except (FanvueAuthError, FanvueApiError, OSError) as exc:
                    queue.mark_error(upload_key, str(exc))
                    log.error("PPV upload failed for %s: %s", sku, exc)
                    raise
            if not media_uuid:
                summary["skipped"].append(sku)
                continue
            if queue.has_done(post_key):
                summary["skipped"].append(sku)
                continue
            if not queue.claim("ppv", "post", post_key, {"sku": sku, "media_uuid": media_uuid}):
                if not queue.retry_error(post_key):
                    summary["skipped"].append(sku)
                    continue
            try:
                post = client.create_post(
                    audience=audience,
                    text=str(item.get("caption") or "unlock"),
                    media_uuids=[media_uuid],
                    price=int(item["price_cents"]),
                )
                queue.mark_done(
                    post_key,
                    {"post_uuid": post.get("uuid"), "sku": sku, "price_cents": item["price_cents"]},
                )
                summary["posted"].append(
                    {
                        "sku": sku,
                        "post_uuid": post.get("uuid"),
                        "price_cents": item["price_cents"],
                    }
                )
                posted += 1
                log.info("posted PPV %s %s cents", sku, item["price_cents"])
            except (FanvueAuthError, FanvueApiError) as exc:
                queue.mark_error(post_key, str(exc))
                log.error("PPV post failed for %s: %s", sku, exc)
                raise
        summary["ppv_posted_total"] = queue.count("ppv", "post")
        if not summary["posted"] and stock["ready"]:
            summary["note"] = "Matched files already posted. Add a new filename to post the next SKU."
        return summary
    finally:
        if owned_queue:
            queue.close()
