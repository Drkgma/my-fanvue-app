#!/usr/bin/env bash
# Start the Phase 0 desk with .env.local winning over truncated Cursor secrets.
set -euo pipefail
cd "$(dirname "$0")/.."
bash .cursor/write-env.sh
eval "$(python3 - <<'PY'
from pathlib import Path
import shlex
path = Path(".env.local")
if not path.exists():
    raise SystemExit(0)
wins = {
    "OAUTH_CLIENT_SECRET",
    "OAUTH_CLIENT_ID",
    "FANVUE_TOKEN",
    "FANVUE_REFRESH_TOKEN",
    "OAUTH_REDIRECT_URI",
    "BASE_URL",
}
for raw in path.read_text(encoding="utf-8").splitlines():
    line = raw.strip()
    if not line or line.startswith("#") or "=" not in line:
        continue
    key, value = line.split("=", 1)
    key = key.strip()
    value = value.strip().strip('"').strip("'")
    if key in wins and value:
        print(f"export {key}={shlex.quote(value)}")
PY
)"
exec pnpm dev -p 3456
