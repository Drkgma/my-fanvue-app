"""Render downloadable 9:16 MP4 cuts of the Obsessed With The Outcome reel.

These are timed still-to-video cuts (not VEO 3 lip-sync). Drop notmonica
Original Audio on top in Instagram. Outputs go to /opt/cursor/artifacts
by default so they are downloadable from this run.
"""

from __future__ import annotations

import argparse
import shutil
import subprocess
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ASSETS = Path("/opt/cursor/artifacts/assets")
BANK = ROOT / "content_bank"
IDENTITY = ROOT / "datasets" / "identity"
DEFAULT_OUT = Path("/opt/cursor/artifacts")
FONT = "/usr/share/fonts/truetype/macos/Inter-SemiBold.ttf"
W, H, FPS = 1080, 1920, 30


def _first_existing(*paths: Path) -> Path:
    for path in paths:
        if path.is_file():
            return path
    raise FileNotFoundError("Missing still: " + " | ".join(str(p) for p in paths))


def stills() -> dict[str, Path]:
    return {
        "hook": _first_existing(ASSETS / "teaser-obsessed-hook.png", BANK / "teaser-obsessed-hook.png"),
        "bubble": _first_existing(ASSETS / "teaser-obsessed-bubble.png", BANK / "teaser-obsessed-bubble.png"),
        "overshoulder": _first_existing(
            ASSETS / "teaser-obsessed-overshoulder.png", BANK / "teaser-obsessed-overshoulder.png"
        ),
        "hold": _first_existing(ASSETS / "teaser-obsessed-hold.png", BANK / "teaser-obsessed-hold.png"),
        "snow": _first_existing(
            IDENTITY / "body-source.jpg",
            Path("/home/ubuntu/.cursor/projects/workspace/assets/58e80520-0cec-4c38-b162-58d3aebdb207.jpg"),
        ),
    }


def _run(cmd: list[str]) -> None:
    result = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    if result.returncode != 0:
        tail = (result.stderr or "")[-2000:]
        raise RuntimeError(f"ffmpeg failed ({result.returncode}): {tail}")


def _clip(src: Path, dest: Path, seconds: float, drawtext: str | None = None) -> None:
    frames = max(1, int(round(seconds * FPS)))
    vf = (
        f"scale={W}:{H}:force_original_aspect_ratio=increase,"
        f"crop={W}:{H},setsar=1,fps={FPS},format=yuv420p"
    )
    if drawtext:
        escaped = drawtext.replace("'", "\\'")
        vf += (
            f",drawtext=fontfile={FONT}:text='{escaped}':fontsize=52:fontcolor=0x111111:"
            f"box=1:boxcolor=white@0.94:boxborderw=28:x=72:y=h*0.20"
        )
    _run(
        [
            "ffmpeg",
            "-y",
            "-loop",
            "1",
            "-framerate",
            str(FPS),
            "-t",
            f"{seconds:.3f}",
            "-i",
            str(src),
            "-vf",
            vf,
            "-frames:v",
            str(frames),
            "-c:v",
            "libx264",
            "-tune",
            "stillimage",
            "-pix_fmt",
            "yuv420p",
            "-an",
            str(dest),
        ]
    )


def _concat(clips: list[Path], dest: Path) -> None:
    listing = dest.with_suffix(".txt")
    listing.write_text("".join(f"file '{clip}'\n" for clip in clips), encoding="utf-8")
    _run(
        [
            "ffmpeg",
            "-y",
            "-f",
            "concat",
            "-safe",
            "0",
            "-i",
            str(listing),
            "-f",
            "lavfi",
            "-t",
            "8",
            "-i",
            "anullsrc=channel_layout=stereo:sample_rate=44100",
            "-c:v",
            "libx264",
            "-pix_fmt",
            "yuv420p",
            "-c:a",
            "aac",
            "-shortest",
            "-movflags",
            "+faststart",
            str(dest),
        ]
    )
    listing.unlink(missing_ok=True)


def render(out_dir: Path) -> dict[str, Path]:
    out_dir.mkdir(parents=True, exist_ok=True)
    src = stills()
    work = Path(tempfile.mkdtemp(prefix="obsessed-reel-"))
    try:
        teaser_parts = [
            (src["hook"], 1.2, None),
            (src["bubble"], 2.3, None),
            (src["overshoulder"], 3.0, None),
            (src["hold"], 1.5, None),
        ]
        ppv_parts = [
            (src["hook"], 1.2, None),
            (src["hook"], 2.3, "this booty"),
            (src["snow"], 3.0, None),
            (src["hold"], 1.5, None),
        ]
        teaser_clips: list[Path] = []
        ppv_clips: list[Path] = []
        for index, (path, seconds, text) in enumerate(teaser_parts):
            clip = work / f"teaser-{index}.mp4"
            _clip(path, clip, seconds, text)
            teaser_clips.append(clip)
        for index, (path, seconds, text) in enumerate(ppv_parts):
            clip = work / f"ppv-{index}.mp4"
            _clip(path, clip, seconds, text)
            ppv_clips.append(clip)
        teaser = out_dir / "obsessed_outcome_teaser.mp4"
        ppv = out_dir / "obsessed_outcome_ppv.mp4"
        _concat(teaser_clips, teaser)
        _concat(ppv_clips, ppv)
        return {"teaser": teaser, "ppv": ppv}
    finally:
        shutil.rmtree(work, ignore_errors=True)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("-o", "--out", type=Path, default=DEFAULT_OUT)
    args = parser.parse_args()
    try:
        paths = render(args.out)
    except (FileNotFoundError, RuntimeError) as exc:
        print(exc)
        return 1
    for key, path in paths.items():
        print(f"{key} {path} {path.stat().st_size}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
