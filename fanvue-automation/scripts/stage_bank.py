"""Copy generated stills into the content bank and room dataset.

Character files (identity / portrait / teaser) go to content_bank/.
Empty-room files (room-*.png) go to datasets/rooms/ so ContentAgent
does not post empty interiors as Fanvue teasers.
"""

from __future__ import annotations

import argparse
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BANK = ROOT / "content_bank"
ROOMS = ROOT / "datasets" / "rooms"
IMAGE_SUFFIXES = {".jpg", ".jpeg", ".png", ".webp"}


def _is_room(path: Path) -> bool:
    return path.stem.lower().startswith("room-")


def stage(source: Path) -> dict[str, list[str]]:
    if not source.is_dir():
        raise FileNotFoundError(f"Source folder does not exist: {source}")
    BANK.mkdir(parents=True, exist_ok=True)
    ROOMS.mkdir(parents=True, exist_ok=True)
    copied: dict[str, list[str]] = {"bank": [], "rooms": []}
    for path in sorted(source.iterdir()):
        if not path.is_file() or path.suffix.lower() not in IMAGE_SUFFIXES:
            continue
        dest_dir = ROOMS if _is_room(path) else BANK
        dest = dest_dir / path.name
        shutil.copy2(path, dest)
        key = "rooms" if dest_dir is ROOMS else "bank"
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
    print(f"bank={len(result['bank'])} rooms={len(result['rooms'])}")
    for name in result["bank"]:
        print(f"bank {name}")
    for name in result["rooms"]:
        print(f"rooms {name}")


if __name__ == "__main__":
    main()
