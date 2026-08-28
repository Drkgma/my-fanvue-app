from __future__ import annotations

from pathlib import Path

from jobs import JobQueue


def test_claim_is_idempotent(tmp_path: Path) -> None:
    queue = JobQueue(tmp_path / "jobs.db")
    assert queue.claim("content", "upload", "file-a", {"n": 1}) is True
    assert queue.claim("content", "upload", "file-a", {"n": 2}) is False
    queue.mark_done("file-a", {"media_uuid": "abc"})
    assert queue.has_done("file-a") is True
def test_retry_error_resets_failed_job(tmp_path: Path) -> None:
    queue = JobQueue(tmp_path / "jobs.db")
    assert queue.claim("content", "upload", "file-b", {"n": 1}) is True
    queue.mark_error("file-b", "no token")
    assert queue.has_done("file-b") is False
    assert queue.retry_error("file-b") is True
    assert queue.retry_error("file-b") is False
    queue.mark_done("file-b", {"media_uuid": "xyz"})
    assert queue.has_done("file-b") is True
    results = queue.done_results("content", "upload")
    assert results[0]["media_uuid"] == "xyz"
    queue.close()


def test_leftover_teaser_count(tmp_path: Path) -> None:
    queue = JobQueue(tmp_path / "jobs.db")
    queue.claim("content", "upload", "content:upload:a", {})
    queue.mark_done("content:upload:a", {"media_uuid": "media-a", "file": "a.png"})
    queue.claim("content", "upload", "content:upload:b", {})
    queue.mark_done("content:upload:b", {"media_uuid": "media-b", "file": "b.png"})
    queue.claim("content", "teaser", "content:teaser:media-a", {})
    queue.mark_done("content:teaser:media-a", {"post_uuid": "post-a"})
    assert queue.leftover_teaser_count() == 1
    queue.close()
