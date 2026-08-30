from __future__ import annotations

import json
from pathlib import Path

import pytest

from agent_workflows import (
    HARD_REFUSALS,
    INDEX_PATH,
    WORKFLOW_IDS,
    WorkflowError,
    dump_cli,
    get_workflow,
    load_index,
    validate_index,
)
from config_loader import REPO_ROOT


def test_index_file_validates() -> None:
    index = load_index()
    assert validate_index(index) == []
    ids = [row["id"] for row in index["workflows"]]
    assert tuple(ids) == WORKFLOW_IDS
    assert index["github_actions"]["enabled"] is False
    assert index["open_first"] == "munder-project/WORKFLOWS.md"
    assert INDEX_PATH == REPO_ROOT / "munder-project" / "workflows.json"


def test_dump_cli_lists_commands() -> None:
    payload = dump_cli()
    assert payload["phase"] == 0
    commands = {row["id"]: row["command"] for row in payload["workflows"]}
    assert commands["telegram-status"] == "python3 run.py status"
    assert commands["telegram-kit"] == "python3 run.py kit"
    assert commands["operate-loop"] == "bash scripts/operate_loop.sh"
    assert commands["telegram-listen"] == "bash scripts/telegram_loop.sh"
    assert commands["improve"] == "python3 run.py improve"
    assert commands["live-numbers"] == "python3 run.py status"


def test_dump_cli_one_workflow() -> None:
    payload = dump_cli("improve")
    assert payload["workflow"]["id"] == "improve"
    assert "enable-chatmate-before-10-subs" in payload["workflow"]["forbidden"]


def test_unknown_workflow_raises() -> None:
    with pytest.raises(WorkflowError, match="unknown workflow"):
        get_workflow("higgsfield-farm")


def test_hard_refusals_are_not_workflow_ids() -> None:
    index = load_index()
    ids = {row["id"] for row in index["workflows"]}
    for banned in (
        "higgsfield",
        "kling",
        "nano-banana",
        "comfyui",
        "instagram-farm",
        "chatmate",
        "trafficagent",
        "face-swap",
    ):
        assert banned not in ids
    for needle in HARD_REFUSALS:
        assert needle in index["forbidden"]


def test_commands_point_at_existing_scripts() -> None:
    automation = REPO_ROOT / "fanvue-automation"
    assert (automation / "run.py").is_file()
    assert (automation / "scripts" / "operate_loop.sh").is_file()
    assert (automation / "scripts" / "telegram_loop.sh").is_file()
    playbook = REPO_ROOT / "munder-project" / "WORKFLOWS.md"
    text = playbook.read_text(encoding="utf-8")
    assert "python3 run.py status" in text
    assert "python3 run.py kit" in text
    assert "scripts/operate_loop.sh" in text
    assert "scripts/telegram_loop.sh" in text
    assert "python3 run.py improve" in text
    assert "GitHub Action" in text


def test_run_py_workflows_cli() -> None:
    from run import main

    assert main(["workflows"]) == 0
    assert main(["workflows", "telegram-status"]) == 0
    assert main(["workflows", "face-swap"]) == 1


def test_validate_index_rejects_enabled_github_actions(tmp_path: Path) -> None:
    dest = tmp_path / "workflows.json"
    payload = load_index()
    payload["github_actions"] = {"enabled": True}
    dest.write_text(json.dumps(payload), encoding="utf-8")
    errors = validate_index(load_index(dest))
    assert any("github_actions" in err for err in errors)
