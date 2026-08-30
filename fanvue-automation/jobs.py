"""SQLite job queue with unique dedupe keys so agents stay idempotent."""

from __future__ import annotations

import json
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

DEFAULT_DB = Path(__file__).resolve().parent / "jobs.db"

SCHEMA = """
CREATE TABLE IF NOT EXISTS jobs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    agent TEXT NOT NULL,
    kind TEXT NOT NULL,
    dedupe_key TEXT NOT NULL UNIQUE,
    payload_json TEXT,
    status TEXT NOT NULL,
    result_json TEXT,
    error TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_jobs_agent_kind ON jobs(agent, kind, status);
"""


def utc_now() -> str:
    """Return an ISO-8601 UTC timestamp."""
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


class JobQueue:
    """Lightweight SQLite queue. ``claim`` is a no-op if the key already exists."""

    def __init__(self, db_path: Path | None = None) -> None:
        self.db_path = Path(db_path) if db_path else DEFAULT_DB
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self._conn = sqlite3.connect(self.db_path)
        self._conn.row_factory = sqlite3.Row
        self._conn.executescript(SCHEMA)
        self._conn.commit()

    def close(self) -> None:
        """Close the SQLite connection."""
        self._conn.close()

    def claim(self, agent: str, kind: str, dedupe_key: str, payload: dict[str, Any] | None = None) -> bool:
        """Insert a pending job. Return False if *dedupe_key* already exists."""
        now = utc_now()
        try:
            self._conn.execute(
                """
                INSERT INTO jobs (agent, kind, dedupe_key, payload_json, status, created_at, updated_at)
                VALUES (?, ?, ?, ?, 'pending', ?, ?)
                """,
                (agent, kind, dedupe_key, json.dumps(payload or {}), now, now),
            )
            self._conn.commit()
            return True
        except sqlite3.IntegrityError:
            return False

    def mark_done(self, dedupe_key: str, result: dict[str, Any] | None = None) -> None:
        """Mark a claimed job as done."""
        self._conn.execute(
            "UPDATE jobs SET status = 'done', result_json = ?, updated_at = ? WHERE dedupe_key = ?",
            (json.dumps(result or {}), utc_now(), dedupe_key),
        )
        self._conn.commit()

    def mark_error(self, dedupe_key: str, error: str) -> None:
        """Mark a claimed job as error without deleting the key (retry must be explicit)."""
        self._conn.execute(
            "UPDATE jobs SET status = 'error', error = ?, updated_at = ? WHERE dedupe_key = ?",
            (error, utc_now(), dedupe_key),
        )
        self._conn.commit()

    def has_done(self, dedupe_key: str) -> bool:
        """Return True if this key already completed successfully."""
        row = self._conn.execute(
            "SELECT status FROM jobs WHERE dedupe_key = ?",
            (dedupe_key,),
        ).fetchone()
        return bool(row) and row["status"] == "done"

    def count(self, agent: str, kind: str, status: str = "done") -> int:
        """Count jobs for an agent/kind/status triple."""
        row = self._conn.execute(
            "SELECT COUNT(*) AS n FROM jobs WHERE agent = ? AND kind = ? AND status = ?",
            (agent, kind, status),
        ).fetchone()
        return int(row["n"]) if row else 0
