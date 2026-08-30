#!/usr/bin/env bash
# Per-boot: overlay Cursor secrets into .env.local, then return.
set -euo pipefail
cd "$(dirname "$0")/.."
bash .cursor/write-env.sh
