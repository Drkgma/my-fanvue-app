from __future__ import annotations

from pathlib import Path

from config_loader import agent_allowed, load_config


def test_missing_config_is_phase_zero(tmp_path: Path) -> None:
    cfg = load_config(tmp_path / "missing.yaml")
    assert cfg["phase"] == 0
    assert cfg["subscriber_target"] == 10


def test_phase_zero_blocks_chat_and_traffic(tmp_path: Path) -> None:
    path = tmp_path / "config.yaml"
    path.write_text("phase: 0\nchat:\n  enabled: true\ntraffic:\n  enabled: true\n", encoding="utf-8")
    cfg = load_config(path)
    ok, reason = agent_allowed("content", cfg)
    assert ok
    ok, reason = agent_allowed("chat", cfg)
    assert not ok
    assert "phase 1" in reason
    ok, reason = agent_allowed("traffic", cfg)
    assert not ok
    assert "phase 2" in reason


def test_phase_one_still_requires_enabled_flag(tmp_path: Path) -> None:
    path = tmp_path / "config.yaml"
    path.write_text("phase: 1\nchat:\n  enabled: false\n", encoding="utf-8")
    cfg = load_config(path)
    ok, reason = agent_allowed("chat", cfg)
    assert not ok
    assert "gated off" in reason
