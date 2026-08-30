from __future__ import annotations

from pathlib import Path

from fanvue_client import API_BASE, FanvueAuthError, FanvueClient
from tests.conftest import FakeResponse, FakeSession, make_client


def test_missing_token_raises_auth_error(tmp_path: Path, monkeypatch) -> None:
    monkeypatch.delenv("FANVUE_TOKEN", raising=False)
    client = FanvueClient(token_path=tmp_path / "no-tokens.json")
    try:
        client.access_token()
        raise AssertionError("expected FanvueAuthError")
    except FanvueAuthError as exc:
        assert "Login" in str(exc) or "token" in str(exc).lower()


def test_get_account_sends_version_header(tmp_path: Path) -> None:
    routes = {
        ("GET", f"{API_BASE}/users/account"): FakeResponse(
            200,
            {
                "handle": "demo",
                "account": {"fans": {"subscribers": 1, "followers": 4}, "earnings": {"total": 0}},
            },
        )
    }
    client = make_client(tmp_path, routes)
    account = client.get_account()
    assert account["account"]["fans"]["subscribers"] == 1
    session = client.session
    assert isinstance(session, FakeSession)
    assert session.calls[0][0] == "GET"


def test_create_post_requires_audience(tmp_path: Path) -> None:
    routes = {
        ("POST", f"{API_BASE}/posts"): FakeResponse(201, {"uuid": "post-1", "audience": "followers-and-subscribers"})
    }
    client = make_client(tmp_path, routes)
    post = client.create_post(audience="followers-and-subscribers", text="teaser", media_uuids=["m1"])
    assert post["uuid"] == "post-1"
