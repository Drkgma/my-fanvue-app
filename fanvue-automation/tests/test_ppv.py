from __future__ import annotations

from pathlib import Path
from typing import Any

from agents import ppv_agent
from jobs import JobQueue
from ppv_catalog import inventory, load_catalog, load_scripts, load_starter, match_item, media_type_for, menu_text, next_shoot_list


class StubClient:
    def __init__(self) -> None:
        self.uploads: list[tuple[str, str]] = []
        self.posts: list[dict[str, Any]] = []

    def upload_file(self, path: Path, media_type: str = "image") -> str:
        self.uploads.append((path.name, media_type))
        return f"media-{path.stem}"

    def wait_until_media_ready(self, media_uuid: str, timeout_s: int = 120) -> dict[str, Any]:
        return {"uuid": media_uuid, "status": "ready"}

    def create_post(self, **kwargs: Any) -> dict[str, Any]:
        self.posts.append(kwargs)
        return {"uuid": f"post-{len(self.posts)}"}


def test_catalog_has_pdf_starter_pack() -> None:
    items = load_starter()
    ids = {row["id"] for row in items}
    assert "lingerie" in ids
    assert "shower" in ids
    assert "riding" in ids
    assert len(items) == 16
    assert all(row["price_cents"] >= 300 for row in items)


def test_match_item_honors_kind(tmp_path: Path) -> None:
    items = load_catalog()
    pic = tmp_path / "lingerie.jpg"
    clip = tmp_path / "shower.mp4"
    pic.write_bytes(b"x")
    clip.write_bytes(b"y")
    assert match_item(pic, items)["id"] == "lingerie"
    assert match_item(clip, items)["id"] == "shower"
    assert match_item(tmp_path / "shower.jpg", items) is None
    assert media_type_for(clip) == "video"


def test_inventory_ready_and_missing(tmp_path: Path, monkeypatch) -> None:
    bank = tmp_path / "ppv"
    bank.mkdir()
    (bank / "lingerie.jpg").write_bytes(b"pic")
    (bank / "random.png").write_bytes(b"nope")
    monkeypatch.setattr(
        "ppv_catalog.load_config",
        lambda: {"content": {"ppv_bank_dir": str(bank)}},
    )
    stock = inventory()
    assert stock["starter_total"] == 16
    assert stock["total"] > 16
    assert len(stock["ready"]) == 1
    assert stock["ready"][0]["item"]["id"] == "lingerie"
    assert "shower" in stock["missing"]
    assert stock["unmatched"] == ["random.png"]


def test_ppv_agent_empty_bank_does_not_post(tmp_path: Path, monkeypatch) -> None:
    bank = tmp_path / "empty"
    bank.mkdir()
    monkeypatch.setattr(
        ppv_agent,
        "load_config",
        lambda: {"content": {"ppv_bank_dir": str(bank), "max_ppv_per_run": 3}},
    )
    monkeypatch.setattr(ppv_agent, "agent_allowed", lambda *args, **kwargs: (True, ""))
    monkeypatch.setattr("ppv_catalog.load_config", lambda: {"content": {"ppv_bank_dir": str(bank)}})
    monkeypatch.setattr(ppv_agent, "get_logger", lambda name: __import__("logging").getLogger("test"))
    result = ppv_agent.run(client=StubClient(), queue=JobQueue(tmp_path / "jobs.db"))
    assert result["posted"] == []
    assert result["ready"] == 0
    assert "will not generate" in result["note"].lower()


def test_ppv_agent_posts_priced_wall_item(tmp_path: Path, monkeypatch) -> None:
    bank = tmp_path / "ppv"
    bank.mkdir()
    (bank / "lingerie.jpg").write_bytes(b"pic")
    cfg = {
        "content": {
            "ppv_bank_dir": str(bank),
            "max_ppv_per_run": 3,
            "ppv_audience": "followers-and-subscribers",
        }
    }
    monkeypatch.setattr(ppv_agent, "load_config", lambda: cfg)
    monkeypatch.setattr("ppv_catalog.load_config", lambda: cfg)
    monkeypatch.setattr(ppv_agent, "agent_allowed", lambda *args, **kwargs: (True, ""))
    monkeypatch.setattr(ppv_agent, "get_logger", lambda name: __import__("logging").getLogger("test"))
    client = StubClient()
    first = ppv_agent.run(client=client, queue=JobQueue(tmp_path / "jobs.db"))
    assert len(first["posted"]) == 1
    assert first["posted"][0]["sku"] == "lingerie"
    assert client.posts[0]["price"] == 800
    assert client.posts[0]["audience"] == "followers-and-subscribers"
    second = ppv_agent.run(client=StubClient(), queue=JobQueue(tmp_path / "jobs.db"))
    assert second["posted"] == []


def test_scripts_have_sales_menu_and_dildo_shots() -> None:
    scripts = load_scripts()
    ids = {row["id"] for row in scripts}
    assert len(scripts) == 10
    assert "s1-chilling-in-bed" in ids
    assert "s10-in-my-bed" in ids
    assert "sales-95" in ids
    catalog_ids = {row["id"] for row in load_catalog()}
    assert "s1-v4-dildo" in catalog_ids
    assert "s2-v2-cowgirl" in catalog_ids
    assert "sales-solo" in catalog_ids
    assert "sales-bj-pov" in catalog_ids


def test_next_shoot_list_names_files(tmp_path: Path, monkeypatch) -> None:
    bank = tmp_path / "ppv"
    bank.mkdir()
    monkeypatch.setattr(
        "ppv_catalog.load_config",
        lambda: {"content": {"ppv_bank_dir": str(bank)}},
    )
    nxt = next_shoot_list(limit=3)
    assert len(nxt) == 3
    assert nxt[0]["filename"].endswith(".jpg") or nxt[0]["filename"].endswith(".mp4")


def test_menu_text_lists_pics_and_clips() -> None:
    text = menu_text()
    assert "Lingerie" in text or "lingerie" in text.lower()
    assert "Shower" in text or "shower" in text.lower()
    assert "Ask for a name" in text
    assert "Chilling in bed" in text
    assert "Chatter sales menu" in text
