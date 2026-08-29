#!/usr/bin/env bash
# Zip the Munder / Cursor instruction folder for the owner's real Desktop.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DEST="${1:-$ROOT/Funny-Kite-Munder-Project.zip}"
python3 - "$ROOT" "$DEST" <<'PY'
import shutil
import sys
import tempfile
from pathlib import Path

root = Path(sys.argv[1])
dest = Path(sys.argv[2])
stage = Path(tempfile.mkdtemp())
folder = stage / "Funny-Kite-Munder-Project"
shutil.copytree(root / "munder-project", folder)
shutil.copy2(root / "fanvue-automation" / ".cursorrules", folder / "fanvue-automation.cursorrules")
shutil.copy2(root / ".cursor" / "rules" / "fanvue-automation.mdc", folder / "fanvue-automation.mdc")
share = root / "fanvue-automation" / "share_kit"
if share.is_dir():
    for name in ("SHARE.txt", "KIT.txt"):
        src = share / name
        if src.exists():
            shutil.copy2(src, folder / name)
if dest.exists():
    dest.unlink()
dest.parent.mkdir(parents=True, exist_ok=True)
shutil.make_archive(str(dest.with_suffix("")), "zip", stage, "Funny-Kite-Munder-Project")
print(f"Wrote {dest}")
shutil.rmtree(stage)
PY
