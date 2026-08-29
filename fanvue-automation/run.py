"""CLI entry: python run.py [login|status|bootstrap|content|ppv|share|kit|listen|improve|chat|money|traffic|analytics|daily|all]."""

from __future__ import annotations

import json
import os
import sys
from pathlib import Path
from typing import Callable

from agent_log import get_logger
from agents import analytics_agent, bootstrap_agent, chat_agent, content_agent, improve_agent, money_agent, ppv_agent, traffic_agent
from config_loader import load_config
from fanvue_client import FanvueAuthError, FanvueClient, login_interactive
from ppv_catalog import inventory as ppv_inventory
from ppv_catalog import next_shoot_list
from share_export import load_progress_payload, write_kit, write_share
from social_kit import run as send_social_kit
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
    """Write SHARE.txt and ping Telegram. Works offline when tokens are missing."""
    log = get_logger("cli")
    config = load_config()
    captions = list((config.get("content") or {}).get("teaser_captions") or [])
    payload = load_progress_payload()
    try:
        payload.update(analytics_agent.run())
    except FanvueAuthError as exc:
        log.error("%s", exc)
        payload["auth_error"] = str(exc)
        payload["note"] = "Offline share kit. Login with Fanvue, then Save tokens."
        send_status({"auth_error": str(exc), "note": payload["note"]})
    if captions:
        payload["teaser_captions"] = captions
    path = write_share(payload)
    text = format_share(payload)
    print(text)
    ping = send(text)
    log.info("telegram share %s local=%s", ping, path)
    print(
        json.dumps(
            {
                "share": ping,
                "local": str(path),
                "public_url": payload.get("public_url"),
                "trial_url": payload.get("trial_url"),
            },
            indent=2,
        )
    )
    return 0


def cmd_kit() -> int:
    """Write KIT.txt and send clothed sets to Telegram when configured."""
    log = get_logger("cli")
    config = load_config()
    payload = load_progress_payload()
    captions = list((config.get("content") or {}).get("teaser_captions") or [])
    if captions:
        payload["teaser_captions"] = captions
    local = write_kit(payload=payload)
    result = send_social_kit(payload)
    result["local"] = str(local)
    print(json.dumps(result, indent=2, default=str))
    log.info("kit albums=%s local=%s", len(result.get("albums") or []), local)
    return 0


def cmd_listen() -> int:
    """Owner Telegram loop. Does not post to Reddit/X. Blocks until killed."""
    from telegram_operator import poll_forever

    poll_forever()
    return 0


def cmd_scripts() -> int:
    """Print the next files to film. Does not generate nudes or clips."""
    log = get_logger("cli")
    stock = ppv_inventory()
    nxt = next_shoot_list(limit=8)
    payload = {
        "ppv_ready": len(stock["ready"]),
        "ppv_total": stock["total"],
        "ppv_packs": stock.get("packs") or [],
        "next": nxt,
        "note": "Film these yourself and drop the files in ppv_bank/. I will not generate nudes or sex clips.",
    }
    print(json.dumps(payload, indent=2, default=str))
    lines = [
        "Funny Kite — next PPV shoot",
        f"Ready {len(stock['ready'])}/{stock['total']}",
        "Film it yourself. No AI nudes.",
    ]
    for row in nxt:
        lines.append(f"- {row['filename']} ({row['pack']})")
    ping = send("\n".join(lines))
    log.info("telegram scripts %s", ping)
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
        ("ppv", ppv_agent.run),
        ("chat", chat_agent.run),
        ("money", money_agent.run),
        ("analytics", analytics_agent.run),
        ("improve", improve_agent.run),
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
        "kit": cmd_kit,
        "listen": cmd_listen,
        "bootstrap": lambda: _run_named("bootstrap", bootstrap_agent.run),
        "content": lambda: _run_named("content", content_agent.run),
        "ppv": lambda: _run_named("ppv", ppv_agent.run),
        "scripts": cmd_scripts,
        "chat": lambda: _run_named("chat", chat_agent.run),
        "money": lambda: _run_named("money", money_agent.run),
        "traffic": lambda: _run_named("traffic", traffic_agent.run),
        "improve": lambda: _run_named("improve", improve_agent.run),
        "analytics": lambda: _run_named("analytics", analytics_agent.run),
        "daily": cmd_daily,
        "all": cmd_all,
        "telegram": cmd_telegram,
    }
    if command not in dispatch:
        print(
            "Usage: python run.py [login|status|bootstrap|content|ppv|scripts|share|kit|listen|improve|chat|money|traffic|analytics|daily|all|telegram]",
            file=sys.stderr,
        )
        return 1
    return dispatch[command]()


if __name__ == "__main__":
    raise SystemExit(main())
