from __future__ import annotations

from pathlib import Path
from typing import Any

from agents import bootstrap_agent, money_agent, traffic_agent
from jobs import JobQueue


class StubClient:
    def __init__(self) -> None:
        self.messages: list[tuple[str, str]] = []
        self.price: int | None = None

    def upsert_automated_message(self, trigger: str, text: str, price: int | None = None) -> dict[str, Any]:
        self.messages.append((trigger, text))
        return {"trigger": trigger, "enabled": True}

    def update_subscription_price(self, cents: int) -> dict[str, Any]:
        self.price = cents
        return {"price": cents}

    def get_account(self) -> dict[str, Any]:
        return {"account": {"fans": {"subscribers": 0}}}


def test_bootstrap_installs_welcomes_in_phase_zero(tmp_path: Path, monkeypatch) -> None:
    cfg = {
        "phase": 0,
        "money": {
            "enabled": False,
            "subscription_price_cents": 999,
            "welcome": {
                "new_follower": "Thanks for following. Subscribe or ask for Pack 1-4.",
                "new_subscriber": "Welcome in. Tip menu: Pack 1 $9.",
                "first_message_reply": "Pack 1 is $9. Which one?",
            },
        },
    }
    monkeypatch.setattr("agents.money_agent.load_config", lambda: cfg)
    client = StubClient()
    queue = JobQueue(tmp_path / "jobs.db")
    result = bootstrap_agent.run(client=client, queue=queue)
    queue.close()
    assert result.get("skipped") is not True
    assert set(result["welcome"]) == {"new_follower", "new_subscriber", "first_message_reply"}
    assert client.price == 999
    assert len(client.messages) == 3
    assert "ChatMate" in result["note"] or "cannot text" in result["note"].lower()


def test_bootstrap_is_idempotent(tmp_path: Path, monkeypatch) -> None:
    cfg = {
        "phase": 0,
        "money": {
            "enabled": False,
            "subscription_price_cents": 999,
            "welcome": {"new_follower": "hi"},
        },
    }
    monkeypatch.setattr("agents.money_agent.load_config", lambda: cfg)
    queue = JobQueue(tmp_path / "jobs.db")
    first = bootstrap_agent.run(client=StubClient(), queue=queue)
    client = StubClient()
    second = bootstrap_agent.run(client=client, queue=queue)
    queue.close()
    assert first["welcome"] == ["new_follower"]
    assert second["welcome"] == ["new_follower"]
    assert client.messages == []
    assert client.price is None


def test_money_and_traffic_stay_gated() -> None:
    money = money_agent.run()
    assert money.get("skipped") is True
    traffic = traffic_agent.run()
    assert traffic.get("skipped") is True
