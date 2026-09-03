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


def test_vol2_has_fifty_one_prompts() -> None:
    from pathlib import Path

    lines = [
        line
        for line in (Path("prompts") / "teaser_prompts_vol2.txt").read_text(encoding="utf-8").splitlines()
        if line.strip()
    ]
    assert len(lines) == 51
    assert all(line.startswith("Use the reference images provided") for line in lines)


_BANNED_TEASER = (
    "dildo",
    "orgasm",
    "nude",
    "lingerie",
    "bikini",
    "thong",
    "masturbat",
    "pussy",
    "stripper",
    "vibrator",
)


def test_content_secrets_pack_stays_clothed() -> None:
    from pathlib import Path

    prompts = Path("prompts")
    guide = (prompts / "content_secrets_sfw.md").read_text(encoding="utf-8")
    mapping = (prompts / "script_teaser_map.txt").read_text(encoding="utf-8")
    captions = (prompts / "curiosity_captions.txt").read_text(encoding="utf-8")

    assert "Phase 0" in guide
    assert "content_bank" in guide
    script_rows = [line for line in mapping.splitlines() if line.startswith("SCRIPT ")]
    assert len(script_rows) >= 10
    caption_rows = [line for line in captions.splitlines() if line.strip() and not line.startswith("#")]
    assert len(caption_rows) >= 15
    blob = f"{mapping}\n{captions}".lower()
    for word in _BANNED_TEASER:
        assert word not in blob, word


def test_lounge_blue_halter_prompt_stays_clothed() -> None:
    from pathlib import Path

    text = (Path("prompts") / "lounge_blue_halter.txt").read_text(encoding="utf-8")
    assert "9:16" in text
    assert "dusty blue" in text.lower()
    assert "content_bank" in text
    blob = text.lower()
    for word in _BANNED_TEASER:
        assert word not in blob, word


def test_private_now_captions_cover_sixteen_stills() -> None:
    from pathlib import Path

    rows = [
        line
        for line in (Path("prompts") / "private_now_captions.txt").read_text(encoding="utf-8").splitlines()
        if line.startswith("private-now-")
    ]
    assert len(rows) == 16
    blob = "\n".join(rows).lower()
    for word in _BANNED_TEASER:
        assert word not in blob, word
