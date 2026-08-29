from __future__ import annotations

from pathlib import Path

from share_export import default_payload, write_kit, write_share
from telegram_notify import format_share


def test_write_share_includes_trial(tmp_path: Path) -> None:
    path = write_share(default_payload(), dest=tmp_path)
    text = path.read_text(encoding="utf-8")
    assert path.name == "SHARE.txt"
    assert "funny-kite-83" in text
    assert "free_trial=" in text
    assert "Copy-paste:" in text
    assert "Ads and TrafficAgent stay off" in text


def test_write_kit_lists_sets(tmp_path: Path) -> None:
    glam = tmp_path / "bank"
    glam.mkdir()
    (glam / "glam-close-portrait.png").write_bytes(b"x")
    (glam / "life-garden-selfie.png").write_bytes(b"x")
    images = list(glam.glob("*.png"))
    path = write_kit(images=images, payload=default_payload(), dest=tmp_path)
    text = path.read_text(encoding="utf-8")
    assert "BIO" in text
    assert "Set 1" in text
    assert "glam-close-portrait.png" in text
    assert "I am not posting to Reddit" in text


def test_offline_share_matches_formatter() -> None:
    payload = default_payload()
    assert "7-day free trial" in format_share(payload).lower() or "Free trial" in format_share(
        payload
    )
