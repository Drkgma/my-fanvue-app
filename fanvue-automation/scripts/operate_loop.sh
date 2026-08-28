#!/usr/bin/env bash
# Keep Phase 0 operating while this Cloud Agent is up.
# Runs status, public teasers, then PPV wall posts if ppv_bank/ has files.
set -euo pipefail
cd "$(dirname "$0")/.."
INTERVAL_SECONDS="${OPERATE_INTERVAL_SECONDS:-21600}"
while true; do
  echo "== $(date -u +%Y-%m-%dT%H:%M:%SZ) status =="
  python3 run.py status || true
  echo "== $(date -u +%Y-%m-%dT%H:%M:%SZ) content =="
  python3 run.py content || true
  echo "== $(date -u +%Y-%m-%dT%H:%M:%SZ) ppv =="
  python3 run.py ppv || true
  echo "sleep ${INTERVAL_SECONDS}s"
  sleep "$INTERVAL_SECONDS"
done
