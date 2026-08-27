"""ContentAgent — upload local images and post a handful of teasers."""

from __future__ import annotations

import hashlib
from pathlib import Path
from typing import Any

from agent_log import get_logger
from config_loader import ROOT, agent_allowed, load_config
from fanvue_client import FanvueApiError, FanvueAuthError, FanvueClient
from jobs import JobQueue

IMAGE_SUFFIXES = {".jpg", ".jpeg", ".png", ".webp", ".gif"}


def _file_key(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _bank_dir(config: dict[str, Any]) -> Path:
    relative = Path(str(config["content"]["bank_dir"]))
    return relative if relative.is_absolute() else ROOT / relative


def list_bank_images(config: dict[str, Any] | None = None) -> list[Path]:
    """Return image files in the content bank. Launch files (if set) come first."""
    cfg = config or load_config()
    folder = _bank_dir(cfg)
    if not folder.exists():
        return []
    images = [
        path for path in folder.iterdir() if path.is_file() and path.suffix.lower() in IMAGE_SUFFIXES
    ]
    priority = [str(name) for name in (cfg.get("content") or {}).get("launch_files") or []]
    rank = {name: index for index, name in enumerate(priority)}
    return sorted(images, key=lambda path: (rank.get(path.name, len(rank)), path.name))


def run(client: FanvueClient | None = None, queue: JobQueue | None = None) -> dict[str, Any]:
    """Upload new bank images (max 20) and publish leftover teasers (max 5)."""
    log = get_logger("content")
    config = load_config()
    allowed, reason = agent_allowed("content", config)
    if not allowed:
        log.info(reason)
        return {"skipped": True, "reason": reason}

    owned_queue = queue is None
    queue = queue or JobQueue()
    client = client or FanvueClient()
    settings = config["content"]
    max_uploads = int(settings.get("max_uploads_per_run") or 20)
    max_teasers = int(settings.get("max_teasers_per_run") or 5)
    captions = list(settings.get("teaser_captions") or ["New photos just dropped."])
    audience = str(settings.get("teaser_audience") or "followers-and-subscribers")

    try:
        images = list_bank_images(config)
        summary: dict[str, Any] = {
            "bank": len(images),
            "uploaded": [],
            "posted": [],
            "skipped": [],
        }
        if not images:
            log.info("Content bank is empty. Drop jpg/png/webp files into content_bank/")
            return summary

        uploaded_this_run = 0
        ready_media: list[tuple[str, Path]] = []
        for path in images:
            digest = _file_key(path)
            upload_key = f"content:upload:{digest}"
            if queue.has_done(upload_key):
                summary["skipped"].append(str(path.name))
                continue
            if uploaded_this_run >= max_uploads:
                break
            if not queue.claim("content", "upload", upload_key, {"file": str(path)}):
                summary["skipped"].append(str(path.name))
                continue
            try:
                media_uuid = client.upload_file(path)
                client.wait_until_media_ready(media_uuid)
                queue.mark_done(upload_key, {"media_uuid": media_uuid})
                summary["uploaded"].append({"file": path.name, "media_uuid": media_uuid})
                ready_media.append((media_uuid, path))
                uploaded_this_run += 1
                log.info("uploaded %s -> %s", path.name, media_uuid)
            except (FanvueAuthError, FanvueApiError, OSError) as exc:
                queue.mark_error(upload_key, str(exc))
                log.error("upload failed for %s: %s", path.name, exc)
                raise

        posted = 0
        for index, (media_uuid, path) in enumerate(ready_media):
            if posted >= max_teasers:
                break
            post_key = f"content:teaser:{media_uuid}"
            if not queue.claim("content", "teaser", post_key, {"media_uuid": media_uuid}):
                continue
            caption = captions[index % len(captions)]
            try:
                post = client.create_post(
                    audience=audience,
                    text=caption,
                    media_uuids=[media_uuid],
                )
                queue.mark_done(post_key, {"post_uuid": post.get("uuid")})
                summary["posted"].append({"media_uuid": media_uuid, "post_uuid": post.get("uuid")})
                posted += 1
                log.info("posted teaser %s", post.get("uuid"))
            except (FanvueAuthError, FanvueApiError) as exc:
                queue.mark_error(post_key, str(exc))
                log.error("teaser failed for %s: %s", media_uuid, exc)
                raise
        return summary
    finally:
        if owned_queue:
            queue.close()
