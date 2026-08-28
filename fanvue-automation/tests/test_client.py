from __future__ import annotations

import os
from pathlib import Path

from fanvue_client import API_BASE, FanvueAuthError, FanvueClient, seed_tokens_from_env
from tests.conftest import FakeResponse, FakeSession, make_client


def test_prefer_longer_file_secrets(tmp_path: Path, monkeypatch) -> None:
    from fanvue_client import prefer_longer_file_secrets

    env_file = tmp_path / ".env.local"
    env_file.write_text("OAUTH_CLIENT_SECRET=" + ("b" * 64) + "\n", encoding="utf-8")
    monkeypatch.setattr("fanvue_client.REPO_ROOT", tmp_path)
    monkeypatch.setattr("fanvue_client.ROOT", tmp_path / "fanvue-automation")
    monkeypatch.setenv("OAUTH_CLIENT_SECRET", "a" * 12)
    prefer_longer_file_secrets()
    assert os.environ["OAUTH_CLIENT_SECRET"] == "b" * 64


def test_missing_token_raises_auth_error(tmp_path: Path, monkeypatch) -> None:
    monkeypatch.delenv("FANVUE_TOKEN", raising=False)
    client = FanvueClient(token_path=tmp_path / "no-tokens.json")
    try:
        client.access_token()
        raise AssertionError("expected FanvueAuthError")
    except FanvueAuthError as exc:
        assert "Login" in str(exc) or "token" in str(exc).lower()


def test_seed_tokens_from_env_writes_file(tmp_path: Path, monkeypatch) -> None:
    dest = tmp_path / "tokens.json"
    monkeypatch.setenv("FANVUE_TOKEN", "access-from-secret")
    monkeypatch.setenv("FANVUE_REFRESH_TOKEN", "refresh-from-secret")
    monkeypatch.setenv("FANVUE_TOKEN_EXPIRES_AT", "1700000000")
    written = seed_tokens_from_env(dest)
    assert written == dest
    payload = dest.read_text(encoding="utf-8")
    assert "access-from-secret" in payload
    assert "refresh-from-secret" in payload
    client = FanvueClient(token_path=dest)
    monkeypatch.delenv("FANVUE_TOKEN", raising=False)
    client._load_tokens()
    assert client._tokens["access_token"] == "access-from-secret"


def test_seed_tokens_from_env_skips_without_secret(tmp_path: Path, monkeypatch) -> None:
    dest = tmp_path / "tokens.json"
    monkeypatch.delenv("FANVUE_TOKEN", raising=False)
    monkeypatch.delenv("FANVUE_REFRESH_TOKEN", raising=False)
    assert seed_tokens_from_env(dest) is None
    assert not dest.exists()


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


def test_free_trial_link_list_and_create(tmp_path: Path) -> None:
    routes = {
        ("GET", f"{API_BASE}/free-trial-links"): FakeResponse(
            200,
            {
                "data": [
                    {
                        "url": "https://www.fanvue.com/funny-kite-83?free_trial=abc",
                        "usedCount": 0,
                        "maxUsages": 10,
                    }
                ]
            },
        ),
        ("POST", f"{API_BASE}/free-trial-links"): FakeResponse(
            201,
            {"url": "https://www.fanvue.com/funny-kite-83?free_trial=new", "maxUsages": 10},
        ),
    }
    client = make_client(tmp_path, routes)
    listed = client.list_free_trial_links()
    assert listed["data"][0]["url"].endswith("free_trial=abc")
    created = client.create_free_trial_link()
    assert created["url"].endswith("free_trial=new")
    session = client.session
    assert isinstance(session, FakeSession)
    assert ("POST", f"{API_BASE}/free-trial-links") in session.calls
