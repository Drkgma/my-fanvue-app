#!/usr/bin/env bash
# Idempotent Cloud Agent install. Must terminate. No long-running servers.
set -euo pipefail
cd "$(dirname "$0")/.."

corepack enable >/dev/null 2>&1 || true
pnpm install --frozen-lockfile

if [ -f fanvue-automation/requirements.txt ]; then
  python3 -m pip install --user -r fanvue-automation/requirements.txt
fi

# Builds cannot see user secrets. Seed a bootable .env.local; start/write-env
# overlays real OAUTH_* values when a Cloud Agent boots.
bash .cursor/write-env.sh
