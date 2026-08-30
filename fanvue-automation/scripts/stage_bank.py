"""Copy generated stills into the content bank and room dataset.

Character teasers go to content_bank/. Empty-room files (room-*.png)
go to datasets/rooms/. Face/body identity sheets (face-source*,
body-source*) go to datasets/identity/ and are never uploaded.
"""

from __future__ import annotations

import argparse
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BANK = ROOT / "content_bank"
ROOMS = ROOT / "datasets" / "rooms"
IDENTITY = ROOT / "datasets" / "identity"
IMAGE_SUFFIXES = {".jpg", ".jpeg", ".png", ".webp"}


def _is_room(path: Path) -> bool:
    return path.stem.lower().startswith("room-")


def _is_identity(path: Path) -> bool:
    stem = path.stem.lower()
    return stem.startswith("face-source") or stem.startswith("body-source")


def _bucket(path: Path) -> str:
    if _is_identity(path):
        return "identity"
    if _is_room(path):
        return "rooms"
    return "bank"


def stage(source: Path) -> dict[str, list[str]]:
    if not source.is_dir():
        raise FileNotFoundError(f"Source folder does not exist: {source}")
    BANK.mkdir(parents=True, exist_ok=True)
    ROOMS.mkdir(parents=True, exist_ok=True)
    IDENTITY.mkdir(parents=True, exist_ok=True)
    dest_for = {"bank": BANK, "rooms": ROOMS, "identity": IDENTITY}
    copied: dict[str, list[str]] = {"bank": [], "rooms": [], "identity": []}
    for path in sorted(source.iterdir()):
        if not path.is_file() or path.suffix.lower() not in IMAGE_SUFFIXES:
            continue
        key = _bucket(path)
        dest = dest_for[key] / path.name
        shutil.copy2(path, dest)
        copied[key].append(dest.name)
    return copied


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "source",
        nargs="?",
        default="/opt/cursor/artifacts/assets",
        help="Folder of generated png/jpg/webp files",
    )
    args = parser.parse_args()
    result = stage(Path(args.source))
    print(
        f"bank={len(result['bank'])} rooms={len(result['rooms'])} "
        f"identity={len(result['identity'])}"
    )
    for key in ("bank", "rooms", "identity"):
        for name in result[key]:
            print(f"{key} {name}")


if __name__ == "__main__":
    main()
