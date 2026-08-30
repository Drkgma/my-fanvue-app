"""Load the Phase 0 agent workflow index for Cursor / Munder operators.

The playbook is munder-project/WORKFLOWS.md. This module only reads the
JSON index. It does not send Telegram, generate images, or enable ChatMate.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from config_loader import REPO_ROOT

INDEX_PATH = REPO_ROOT / "munder-project" / "workflows.json"
WORKFLOW_IDS = (
    "telegram-status",
    "telegram-kit",
    "operate-loop",
    "telegram-listen",
    "improve",
    "live-numbers",
)
REQUIRED_FIELDS = ("id", "trigger", "command", "forbidden")
HARD_REFUSALS = (
    "nsfw-generation",
    "face-swap",
    "higgsfield-on-vm",
    "enable-chatmate-before-10-subs",
    "enable-trafficagent-before-phase-2",
    "instagram-farm",
    "reddit-farm",
)


class WorkflowError(RuntimeError):
    """Raised when the workflow index is missing or invalid."""


def load_index(path: Path | None = None) -> dict[str, Any]:
    """Return the workflow pack. Missing file is an error — agents need the list."""
    dest = path or INDEX_PATH
    try:
        payload = json.loads(dest.read_text(encoding="utf-8"))
    except FileNotFoundError as exc:
        raise WorkflowError(f"workflow index missing: {dest}") from exc
    except ValueError as exc:
        raise WorkflowError(f"workflow index is not JSON: {dest}") from exc
    if not isinstance(payload, dict):
        raise WorkflowError("workflow index must be an object")
    return payload


def list_workflows(index: dict[str, Any] | None = None) -> list[dict[str, Any]]:
    """Allowed workflows only. Order matches WORKFLOWS.md."""
    data = index if index is not None else load_index()
    rows = data.get("workflows") or []
    return [row for row in rows if isinstance(row, dict)]


def get_workflow(workflow_id: str, index: dict[str, Any] | None = None) -> dict[str, Any]:
    """Return one workflow by id."""
    wanted = (workflow_id or "").strip().lower()
    for row in list_workflows(index):
        if str(row.get("id") or "").lower() == wanted:
            return row
    known = ", ".join(str(row.get("id")) for row in list_workflows(index))
    raise WorkflowError(f"unknown workflow {workflow_id!r}. known: {known}")


def validate_index(index: dict[str, Any] | None = None) -> list[str]:
    """Return human error strings. Empty list means the pack is usable."""
    data = index if index is not None else load_index()
    errors: list[str] = []
    if data.get("phase") != 0:
        errors.append("phase must be 0")
    if data.get("open_first") != "munder-project/WORKFLOWS.md":
        errors.append("open_first must point at munder-project/WORKFLOWS.md")
    if data.get("github_actions") and (data["github_actions"] or {}).get("enabled"):
        errors.append("github_actions must stay disabled until TELEGRAM_* GH secrets exist")
    top_forbidden = set(data.get("forbidden") or [])
    for needle in HARD_REFUSALS:
        if needle not in top_forbidden:
            errors.append(f"top-level forbidden missing {needle}")
    rows = list_workflows(data)
    ids = [str(row.get("id") or "") for row in rows]
    if tuple(ids) != WORKFLOW_IDS:
        errors.append(f"workflow ids must be {list(WORKFLOW_IDS)}, got {ids}")
    if len(ids) != len(set(ids)):
        errors.append("duplicate workflow id")
    for row in rows:
        for field in REQUIRED_FIELDS:
            if not row.get(field):
                errors.append(f"{row.get('id')}: missing {field}")
        if not isinstance(row.get("forbidden"), list):
            errors.append(f"{row.get('id')}: forbidden must be a list")
    return errors


def dump_cli(workflow_id: str | None = None, index: dict[str, Any] | None = None) -> dict[str, Any]:
    """JSON payload for `python run.py workflows [id]`."""
    data = index if index is not None else load_index()
    problems = validate_index(data)
    if problems:
        raise WorkflowError("; ".join(problems))
    if workflow_id:
        row = get_workflow(workflow_id, data)
        return {
            "open_first": data.get("open_first"),
            "phase": data.get("phase"),
            "cwd": row.get("cwd") or data.get("cwd"),
            "workflow": row,
        }
    return {
        "open_first": data.get("open_first"),
        "phase": data.get("phase"),
        "cwd": data.get("cwd"),
        "github_actions": data.get("github_actions"),
        "forbidden": data.get("forbidden"),
        "workflows": [
            {
                "id": row.get("id"),
                "trigger": row.get("trigger"),
                "command": row.get("command"),
                "cwd": row.get("cwd") or data.get("cwd"),
                "forbidden": row.get("forbidden"),
            }
            for row in list_workflows(data)
        ],
    }
