"""Post priced wall items from ppv_bank/. Does not generate nudes. No PPV DMs."""

from __future__ import annotations

import hashlib
from pathlib import Path
from typing import Any

from agent_log import get_logger
from config_loader import agent_allowed, load_config
from fanvue_client import FanvueApiError, FanvueAuthError, FanvueClient
from jobs import JobQueue
from ppv_catalog import inventory, media_type_for, sell_pack_inventory


def _file_key(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _digest_paths(paths: list[Path]) -> str:
    digest = hashlib.sha256()
    for path in sorted(paths, key=lambda item: item.name):
        digest.update(path.name.encode("utf-8"))
        digest.update(_file_key(path).encode("utf-8"))
    return digest.hexdigest()[:16]


def _upload_path(client: FanvueClient, queue: JobQueue, path: Path, sku: str, summary: dict[str, Any]) -> str:
    digest = _file_key(path)
    upload_key = f"ppv:upload:{sku}:{digest}"
    if queue.has_done(upload_key):
        for done in queue.done_results("ppv", "upload"):
            if done.get("sku") == sku and done.get("digest") == digest:
                return str(done.get("media_uuid") or "")
        return ""
    claimed = queue.claim("ppv", "upload", upload_key, {"file": path.name, "sku": sku})
    if not claimed and not queue.retry_error(upload_key):
        return ""
    media_uuid = client.upload_file(path, media_type=media_type_for(path))
    wait_s = 300 if media_type_for(path) == "video" else 120
    client.wait_until_media_ready(media_uuid, timeout_s=wait_s)
    queue.mark_done(
        upload_key,
        {"media_uuid": media_uuid, "file": path.name, "sku": sku, "digest": digest},
    )
    summary["uploaded"].append({"sku": sku, "file": path.name, "media_uuid": media_uuid})
    return media_uuid


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
        if not stock["ready"] and not any(row["ready"] for row in sell_pack_inventory(config)):
            summary["note"] = (
                "PPV bank is empty. For the $9–$75 packs drop pack1-01.jpg + pack1-tease.mp4 "
                "(then pack2/3/4). I will not generate lingerie or nudes."
            )
            log.info(summary["note"])
            return summary

        posted = 0
        for pack in sell_pack_inventory(config):
            if posted >= max_posts:
                break
            if not pack["ready"]:
                continue
            paths: list[Path] = list(pack["files"])
            sku = pack["id"]
            bundle = _digest_paths(paths)
            post_key = f"ppv:pack:{sku}:{bundle}"
            if queue.has_done(post_key):
                summary["skipped"].append(sku)
                continue
            media_uuids: list[str] = []
            for path in paths:
                try:
                    media_uuid = _upload_path(client, queue, path, f"{sku}:{path.stem}", summary)
                except (FanvueAuthError, FanvueApiError, OSError) as exc:
                    queue.mark_error(post_key, str(exc))
                    log.error("pack upload failed for %s: %s", sku, exc)
                    raise
                if media_uuid:
                    media_uuids.append(media_uuid)
            if len(media_uuids) < int(pack["min_pics"]) + int(pack["min_videos"]):
                summary["skipped"].append(sku)
                continue
            if not queue.claim("ppv", "post", post_key, {"sku": sku, "files": [p.name for p in paths]}):
                if not queue.retry_error(post_key):
                    summary["skipped"].append(sku)
                    continue
            try:
                post = client.create_post(
                    audience=audience,
                    text=str(pack.get("caption") or "unlock"),
                    media_uuids=media_uuids,
                    price=int(pack["price_cents"]),
                )
                queue.mark_done(
                    post_key,
                    {"post_uuid": post.get("uuid"), "sku": sku, "price_cents": pack["price_cents"]},
                )
                summary["posted"].append(
                    {
                        "sku": sku,
                        "post_uuid": post.get("uuid"),
                        "price_cents": pack["price_cents"],
                        "media": len(media_uuids),
                    }
                )
                posted += 1
                log.info("posted pack %s %s cents (%s files)", sku, pack["price_cents"], len(media_uuids))
            except (FanvueAuthError, FanvueApiError) as exc:
                queue.mark_error(post_key, str(exc))
                log.error("pack post failed for %s: %s", sku, exc)
                raise

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
