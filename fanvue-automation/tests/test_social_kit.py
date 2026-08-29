from __future__ import annotations

from pathlib import Path

from social_kit import album_caption, chunk_paths, format_setup, group_sets, matches_prefix
from telegram_notify import send_media_group, send_photo


def test_body_prefix_does_not_eat_body2() -> None:
    assert matches_prefix("body-street-standing.png", "body-")
    assert not matches_prefix("body2-studio-white-shirt.png", "body-")
    assert matches_prefix("body2-studio-white-shirt.png", "body2-")


def test_group_sets_buckets_and_chunks(tmp_path: Path) -> None:
    names = [
        "glam-close-portrait.png",
        "glam-turtleneck.png",
        "life-garden-selfie.png",
        "casual-kitchen-mug.png",
        "body2-studio-white-shirt.png",
        "body-street-standing.png",
        "body-window-sweater.png",
    ]
    images = []
    for name in names:
        path = tmp_path / name
        path.write_bytes(b"x")
        images.append(path)
    sets = {row["id"]: row for row in group_sets(images)}
    assert [p.name for p in sets["glam"]["files"]] == [
        "glam-close-portrait.png",
        "glam-turtleneck.png",
    ]
    assert [p.name for p in sets["looks-b"]["files"]] == ["body2-studio-white-shirt.png"]
    assert [p.name for p in sets["looks-a"]["files"]] == [
        "body-street-standing.png",
        "body-window-sweater.png",
    ]
    extra = ["f%02d.png" % i for i in range(13)]
    paths = [tmp_path / name for name in extra]
    for path in paths:
        path.write_bytes(b"x")
    chunks = chunk_paths(paths, 10)
    assert [len(c) for c in chunks] == [10, 3]


def test_format_setup_is_bio_not_reddit() -> None:
    text = format_setup(
        {
            "trial_url": "https://www.fanvue.com/funny-kite-83?free_trial=abc",
            "teaser_captions": ["hi, it's me — more on the page if you want it"],
        }
    )
    assert "BIO" in text
    assert "free_trial=abc" in text
    assert "I am not posting to Reddit" in text
    assert "hi, it's me" in text


def test_album_caption_includes_set_and_trial() -> None:
    spec = {
        "title": "Set 1 — Glam close-ups",
        "use": "Profile photo.",
        "files": [Path("a.png"), Path("b.png")],
    }
    text = album_caption(spec, "https://example/trial", "hi, it's me")
    assert "Set 1" in text
    assert "https://example/trial" in text
    assert len(text) <= 1024


def test_send_photo_skips_without_token(monkeypatch, tmp_path: Path) -> None:
    monkeypatch.setattr("telegram_notify._token", lambda: "")
    monkeypatch.setattr("telegram_notify._chat_id", lambda: "1")
    dest = tmp_path / "a.png"
    dest.write_bytes(b"x")
    assert send_photo(dest)["ok"] is False


def test_send_media_group_skips_without_chat(monkeypatch, tmp_path: Path) -> None:
    monkeypatch.setattr("telegram_notify._token", lambda: "tok")
    monkeypatch.setattr("telegram_notify._chat_id", lambda: "")
    dest = tmp_path / "a.png"
    dest.write_bytes(b"x")
    result = send_media_group([dest, dest])
    assert result["ok"] is False
    assert "TELEGRAM_CHAT_ID" in result["reason"]
