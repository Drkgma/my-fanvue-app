from __future__ import annotations

from pathlib import Path

from jobs import JobQueue


def test_claim_is_idempotent(tmp_path: Path) -> None:
    queue = JobQueue(tmp_path / "jobs.db")
    assert queue.claim("content", "upload", "file-a", {"n": 1}) is True
    assert queue.claim("content", "upload", "file-a", {"n": 2}) is False
    queue.mark_done("file-a", {"media_uuid": "abc"})
    assert queue.has_done("file-a") is True
    assert queue.count("content", "upload") == 1
    queue.close()
