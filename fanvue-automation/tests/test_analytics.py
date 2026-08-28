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


def test_write_progress_keeps_trial_url(tmp_path: Path) -> None:
    dest = tmp_path / "progress.json"
    write_progress(
        {
            "subscribers": 0,
            "trial_url": "https://www.fanvue.com/funny-kite-83?free_trial=abc",
        },
        dest,
    )
    assert "free_trial=abc" in dest.read_text(encoding="utf-8")


def test_analytics_run_persists_open_trial(tmp_path: Path, monkeypatch) -> None:
    from agents.analytics_agent import run as analytics_run
    from jobs import JobQueue

    routes = {
        ("GET", f"{API_BASE}/users/account"): FakeResponse(
            200,
            {
                "handle": "funny-kite-83",
                "account": {
                    "fans": {"subscribers": 0, "followers": 0},
                    "earnings": {"total": 399},
                },
            },
        ),
        ("GET", f"{API_BASE}/posts"): FakeResponse(
            200,
            {"data": [{"uuid": "a"}], "pagination": {"page": 1, "hasMore": False}},
        ),
        ("GET", f"{API_BASE}/users/me"): FakeResponse(
            200,
            {
                "isDiscoverable": True,
                "isInCuratedSection": False,
                "contentCounts": {"videoCount": 0},
                "likesCount": 0,
            },
        ),
        ("GET", f"{API_BASE}/free-trial-links"): FakeResponse(
            200,
            {
                "data": [
                    {
                        "url": "https://www.fanvue.com/funny-kite-83?free_trial=abc",
                        "usedCount": 0,
                        "maxUsages": 10,
                        "trialDurationDays": 7,
                    }
                ]
            },
        ),
    }
    client = make_client(tmp_path, routes)
    monkeypatch.setattr("agents.analytics_agent.PROGRESS_PATH", tmp_path / "progress.json")
    monkeypatch.setattr("agents.analytics_agent.send", lambda *args, **kwargs: {"ok": True})
    data = analytics_run(client=client, queue=JobQueue(tmp_path / "jobs.db"))
    assert data["trial_url"] == "https://www.fanvue.com/funny-kite-83?free_trial=abc"
    assert "free_trial=abc" in (tmp_path / "progress.json").read_text(encoding="utf-8")
    assert "7-day free trial" in (data.get("share_note") or "")


def test_count_listed_posts_pages_until_has_more_false(tmp_path: Path) -> None:
    routes = {
        ("GET", f"{API_BASE}/posts"): FakeResponse(
            200,
            {"data": [{"uuid": "a"}, {"uuid": "b"}], "pagination": {"page": 1, "hasMore": False}},
        )
    }
    client = make_client(tmp_path, routes)
    assert count_listed_posts(client) == 2
