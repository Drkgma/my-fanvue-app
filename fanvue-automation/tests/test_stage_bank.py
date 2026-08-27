from __future__ import annotations

from pathlib import Path

from scripts.stage_bank import stage


def test_stage_splits_rooms_from_teasers(tmp_path: Path, monkeypatch) -> None:
    source = tmp_path / "gen"
    source.mkdir()
    (source / "teaser-one.png").write_bytes(b"teaser")
    (source / "room-kitchen.png").write_bytes(b"room")
    (source / "notes.txt").write_text("skip")

    bank = tmp_path / "bank"
    rooms = tmp_path / "rooms"
    monkeypatch.setattr("scripts.stage_bank.BANK", bank)
    monkeypatch.setattr("scripts.stage_bank.ROOMS", rooms)

    result = stage(source)
    assert result["bank"] == ["teaser-one.png"]
    assert result["rooms"] == ["room-kitchen.png"]
    assert (bank / "teaser-one.png").read_bytes() == b"teaser"
    assert (rooms / "room-kitchen.png").read_bytes() == b"room"
