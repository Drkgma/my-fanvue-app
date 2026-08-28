from __future__ import annotations

from pathlib import Path
from typing import Any

from agents import content_agent
from jobs import JobQueue


class StubClient:
    def __init__(self) -> None:
        self.uploads: list[str] = []
        self.posts: list[dict[str, Any]] = []

    def upload_file(self, path: Path, media_type: str = "image") -> str:
        self.uploads.append(path.name)
        return f"media-{path.stem}"

    def wait_until_media_ready(self, media_uuid: str, timeout_s: int = 120) -> dict[str, Any]:
        return {"uuid": media_uuid, "status": "ready"}

    def create_post(self, **kwargs: Any) -> dict[str, Any]:
        self.posts.append(kwargs)
        return {"uuid": f"post-{len(self.posts)}"}


def test_content_agent_uploads_and_posts_once(tmp_path: Path, monkeypatch) -> None:
    bank = tmp_path / "bank"
    bank.mkdir()
    (bank / "one.jpg").write_bytes(b"fake-jpeg-1")
    (bank / "two.jpg").write_bytes(b"fake-jpeg-2")

    monkeypatch.setattr(
        content_agent,
        "load_config",
        lambda: {
            "phase": 0,
            "content": {
                "bank_dir": str(bank),
                "max_uploads_per_run": 20,
                "max_teasers_per_run": 5,
                "teaser_audience": "followers-and-subscribers",
                "teaser_captions": ["hello"],
            },
        },
    )
    monkeypatch.setattr(content_agent, "agent_allowed", lambda *args, **kwargs: (True, ""))
    monkeypatch.setattr(content_agent, "get_logger", lambda name: __import__("logging").getLogger("test"))

    queue = JobQueue(tmp_path / "jobs.db")
    client = StubClient()
    first = content_agent.run(client=client, queue=queue)
    assert len(first["uploaded"]) == 2
    assert len(first["posted"]) == 2
    assert first["leftover_teasers"] == 0
    assert first["teasers_posted"] == 2
    queue.close()

    queue = JobQueue(tmp_path / "jobs.db")
    client2 = StubClient()
    second = content_agent.run(client=client2, queue=queue)
    queue.close()
    assert second["uploaded"] == []
    assert second["posted"] == []
    assert len(second["skipped"]) == 2


def test_list_bank_images_honors_launch_files(tmp_path: Path, monkeypatch) -> None:
    bank = tmp_path / "bank"
    bank.mkdir()
    (bank / "zzz.png").write_bytes(b"z")
    (bank / "aaa.png").write_bytes(b"a")
    (bank / "mid.png").write_bytes(b"m")
    monkeypatch.setattr(
        content_agent,
        "load_config",
        lambda: {
            "content": {
                "bank_dir": str(bank),
                "launch_files": ["mid.png", "zzz.png"],
            }
        },
    )
    names = [path.name for path in content_agent.list_bank_images()]
    assert names[:2] == ["mid.png", "zzz.png"]
    assert names[2] == "aaa.png"
