from __future__ import annotations

from pathlib import Path

from agents.analytics_agent import count_listed_posts, public_page_url, snapshot, write_progress
from tests.conftest import FakeResponse, make_client
from fanvue_client import API_BASE


def test_public_page_url() -> None:
    assert public_page_url("funny-kite-83") == "https://www.fanvue.com/funny-kite-83"
    assert public_page_url("@funny-kite-83") == "https://www.fanvue.com/funny-kite-83"


def test_snapshot_includes_public_url() -> None:
    data = snapshot(
        {
            "handle": "funny-kite-83",
            "account": {"fans": {"subscribers": 0, "followers": 0}, "earnings": {"total": 399}},
        },
        {"data": [1, 2, 3]},
    )
    assert data["posts_listed"] == 3
    assert data["public_url"] == "https://www.fanvue.com/funny-kite-83"
    assert data["earnings_cents"] == 399


def test_write_progress(tmp_path: Path) -> None:
    dest = tmp_path / "progress.json"
    write_progress({"subscribers": 0, "handle": "funny-kite-83"}, dest)
    assert dest.exists()
    assert "funny-kite-83" in dest.read_text(encoding="utf-8")


def test_count_listed_posts_pages_until_has_more_false(tmp_path: Path) -> None:
    routes = {
        ("GET", f"{API_BASE}/posts"): FakeResponse(
            200,
            {"data": [{"uuid": "a"}, {"uuid": "b"}], "pagination": {"page": 1, "hasMore": False}},
        )
    }
    client = make_client(tmp_path, routes)
    assert count_listed_posts(client) == 2
