from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import pytest

from jobs import JobQueue
from fanvue_client import FanvueClient


@pytest.fixture
def queue(tmp_path: Path) -> JobQueue:
    return JobQueue(tmp_path / "jobs.db")


class FakeResponse:
    def __init__(self, status: int, payload: Any, headers: dict[str, str] | None = None, text: str = "") -> None:
        self.status_code = status
        self._payload = payload
        self.headers = headers or {"Content-Type": "application/json"}
        self.text = text or (json.dumps(payload) if not isinstance(payload, str) else payload)
        self.content = self.text.encode("utf-8") if self.text else b""

    @property
    def ok(self) -> bool:
        return 200 <= self.status_code < 300

    def json(self) -> Any:
        return self._payload


class FakeSession:
    def __init__(self, routes: dict[tuple[str, str], FakeResponse]) -> None:
        self.routes = routes
        self.calls: list[tuple[str, str]] = []

    def request(self, method: str, url: str, **kwargs: Any) -> FakeResponse:
        self.calls.append((method, url))
        key = (method.upper(), url)
        if key not in self.routes:
            path_only = url.split("?", 1)[0]
            key = (method.upper(), path_only)
        if key not in self.routes:
            raise AssertionError(f"unexpected {method} {url}")
        return self.routes[key]


def make_client(tmp_path: Path, routes: dict[tuple[str, str], FakeResponse]) -> FanvueClient:
    token_path = tmp_path / "tokens.json"
    token_path.write_text(json.dumps({"access_token": "test-token", "expires_at": 9999999999999}), encoding="utf-8")
    client = FanvueClient(token_path=token_path, session=FakeSession(routes))  # type: ignore[arg-type]
    return client
