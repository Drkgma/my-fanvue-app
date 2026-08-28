"""CLI entry: python run.py [login|status|content|share|chat|money|traffic|analytics|daily|all]."""

from __future__ import annotations

import json
import os
import sys
from pathlib import Path
from typing import Callable

from agent_log import get_logger
from agents import analytics_agent, chat_agent, content_agent, money_agent, traffic_agent
from config_loader import load_config
from fanvue_client import FanvueAuthError, FanvueClient, login_interactive
from telegram_notify import discover_chat_id, format_share, send, send_status


def cmd_status() -> int:
    """Print the Phase 0 scoreboard."""
    log = get_logger("cli")
    config = load_config()
    print(json.dumps({"phase": config.get("phase"), "subscriber_target": config.get("subscriber_target")}, indent=2))
    try:
        result = analytics_agent.run()
        print(json.dumps(result, indent=2))
        ping = send_status(result)
        log.info("telegram %s", ping)
        return 0
    except FanvueAuthError as exc:
        log.error("%s", exc)
        print(str(exc), file=sys.stderr)
        send_status({"auth_error": str(exc), "note": "Login with Fanvue, then Save tokens."})
        return 2


def cmd_telegram() -> int:
    """Discover chat id from /start and send a test ping."""
    log = get_logger("cli")
    chat_id = discover_chat_id()
    if not chat_id:
        print("No private chat yet. Open Telegram, tap /start on @drkgma78bot, then re-run python run.py telegram.")
        return 2
    env_path = Path(__file__).resolve().parent / ".env"
    lines = env_path.read_text(encoding="utf-8").splitlines() if env_path.exists() else []
    written = False
    out: list[str] = []
    for line in lines:
        if line.startswith("TELEGRAM_CHAT_ID="):
            out.append(f"TELEGRAM_CHAT_ID={chat_id}")
            written = True
        else:
            out.append(line)
    if not written:
        out.append(f"TELEGRAM_CHAT_ID={chat_id}")
    env_path.write_text("\n".join(out) + "\n", encoding="utf-8")
    try:
        os.chmod(env_path, 0o600)
    except OSError:
        pass
    os.environ["TELEGRAM_CHAT_ID"] = chat_id
    ping = send(
        "Funny Kite — Phase 0\n"
        "Telegram is connected.\n"
        "Content bank is ready. Fanvue posting still needs Login + Save tokens.\n"
        "I will send scoreboard updates here."
    )
    log.info("telegram %s", ping)
    print(json.dumps({"chat_id_saved": True, "telegram": ping}, indent=2))
    return 0 if ping.get("ok") else 2


def cmd_share() -> int:
    """Ping Telegram with the public page + a copy-paste caption. No ads."""
    log = get_logger("cli")
    config = load_config()
    try:
        result = analytics_agent.run()
    except FanvueAuthError as exc:
        log.error("%s", exc)
        send_status({"auth_error": str(exc), "note": "Login with Fanvue, then Save tokens."})
        return 2
    captions = list((config.get("content") or {}).get("teaser_captions") or [])
    payload = dict(result)
    payload["teaser_captions"] = captions
    ping = send(format_share(payload))
    log.info("telegram share %s", ping)
    print(json.dumps({"share": ping, "public_url": payload.get("public_url")}, indent=2))
    return 0 if ping.get("ok") else 2


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
        if isinstance(result, dict):
            payload = dict(result)
            payload.setdefault("note", f"{name} finished")
            ping = send_status(payload)
            log.info("telegram %s", ping)
        return 0
    except FanvueAuthError as exc:
        log.error("%s", exc)
        print(str(exc), file=sys.stderr)
        send_status({"auth_error": str(exc), "note": f"{name} did not run. Fix Fanvue login first."})
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
        "share": cmd_share,
        "content": lambda: _run_named("content", content_agent.run),
        "chat": lambda: _run_named("chat", chat_agent.run),
        "money": lambda: _run_named("money", money_agent.run),
        "traffic": lambda: _run_named("traffic", traffic_agent.run),
        "analytics": lambda: _run_named("analytics", analytics_agent.run),
        "daily": cmd_daily,
        "all": cmd_all,
        "telegram": cmd_telegram,
    }
    if command not in dispatch:
        print(
            "Usage: python run.py [login|status|content|share|chat|money|traffic|analytics|daily|all|telegram]",
            file=sys.stderr,
        )
        return 1
    return dispatch[command]()


if __name__ == "__main__":
    raise SystemExit(main())
