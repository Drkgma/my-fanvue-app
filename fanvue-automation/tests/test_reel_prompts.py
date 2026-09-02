from __future__ import annotations

import json

from reel_prompts import (
    LIP_SYNC_LINE,
    load_reel,
    public_teaser_is_safe,
    validate_reel,
)


def test_teaser_prompt_is_paste_ready() -> None:
    data = load_reel("teaser")
    assert validate_reel(data) == []
    assert public_teaser_is_safe(data)
    assert data["audience"] == "followers-and-subscribers"
    assert data["phase"] == 0
    assert data["text_bubble"] == "this new set"
    assert data["lip_sync_line"] == LIP_SYNC_LINE
    assert "9:16" in data["keywords"]
    assert "bikini" not in json.dumps(data).lower()


def test_ppv_prompt_stays_out_of_the_bank() -> None:
    data = load_reel("ppv")
    assert validate_reel(data) == []
    assert data["do_not_upload_to_content_bank"] is True
    assert data["audience"] == "subscribers-only"
    assert data["text_bubble"] == "this booty"
    assert data["phase"] == 1
    assert "bikini" in str(data["outfit"]).lower()


def test_print_script_exits_zero(tmp_path, monkeypatch, capsys) -> None:
    from scripts.print_reel_prompt import main

    monkeypatch.setattr("sys.argv", ["print_reel_prompt.py", "teaser"])
    assert main() == 0
    dumped = json.loads(capsys.readouterr().out)
    assert dumped["reel_id"] == "obsessed-outcome-teaser"


def test_render_script_is_nine_by_sixteen() -> None:
    from scripts import render_obsessed_reel as render

    assert (render.W, render.H, render.FPS) == (1080, 1920, 30)
