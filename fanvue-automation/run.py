"""CLI entry: python run.py [login|status|content|chat|money|traffic|analytics|daily|all]."""

from __future__ import annotations

import json
import sys
from typing import Callable

from agent_log import get_logger
from agents import analytics_agent, chat_agent, content_agent, money_agent, traffic_agent
from config_loader import load_config
from fanvue_client import FanvueAuthError, FanvueClient, login_interactive


def cmd_status() -> int:
    """Print the Phase 0 scoreboard."""
    log = get_logger("cli")
    config = load_config()
    print(json.dumps({"phase": config.get("phase"), "subscriber_target": config.get("subscriber_target")}, indent=2))
    try:
        result = analytics_agent.run()
        print(json.dumps(result, indent=2))
        return 0
    except FanvueAuthError as exc:
        log.error("%s", exc)
        print(str(exc), file=sys.stderr)
        return 2


def cmd_login() -> int:
    """Browser PKCE login; writes fanvue-automation/tokens.json."""
    path = login_interactive()
    print(f"Saved tokens to {path}")
    client = FanvueClient(token_path=path)
    me = client.get_me()
    print(json.dumps({"uuid": me.get("uuid"), "handle": me.get("handle")}, indent=2))
    return 0


def _run_named(name: str, fn: Callable[[], object]) -> int:
    log = get_logger("cli")
    try:
        result = fn()
        print(json.dumps(result, indent=2, default=str))
        return 0
    except FanvueAuthError as exc:
        log.error("%s", exc)
        print(str(exc), file=sys.stderr)
        return 2


def cmd_daily() -> int:
    """Phase 1 daily: content + chat + money + analytics. Content still runs in phase 0."""
    code = 0
    for name, fn in (
        ("content", content_agent.run),
        ("chat", chat_agent.run),
        ("money", money_agent.run),
        ("analytics", analytics_agent.run),
    ):
        print(f"== {name} ==")
        step = _run_named(name, fn)
        if step != 0:
            code = step
    return code


def cmd_all() -> int:
    """Phase 2+ full stack. TrafficAgent still no-ops until phase >= 2."""
    code = cmd_daily()
    print("== traffic ==")
    step = _run_named("traffic", traffic_agent.run)
    return step if step != 0 else code


def main(argv: list[str] | None = None) -> int:
    """Dispatch a single agent or a bundle."""
    args = list(sys.argv[1:] if argv is None else argv)
    command = (args[0] if args else "status").lower()
    dispatch = {
        "login": cmd_login,
        "status": cmd_status,
        "content": lambda: _run_named("content", content_agent.run),
        "chat": lambda: _run_named("chat", chat_agent.run),
        "money": lambda: _run_named("money", money_agent.run),
        "traffic": lambda: _run_named("traffic", traffic_agent.run),
        "analytics": lambda: _run_named("analytics", analytics_agent.run),
        "daily": cmd_daily,
        "all": cmd_all,
    }
    if command not in dispatch:
        print("Usage: python run.py [login|status|content|chat|money|traffic|analytics|daily|all]", file=sys.stderr)
        return 1
    return dispatch[command]()


if __name__ == "__main__":
    raise SystemExit(main())
