#!/usr/bin/env bash
# Hands-off Phase 0 loop while this Cloud Agent VM is up.
# Welcome DMs, scoreboard, public teasers, then PPV wall posts if ppv_bank/ has files.
# ChatMate, ads, and TrafficAgent stay off.
set -euo pipefail
cd "$(dirname "$0")/.."
INTERVAL_SECONDS="${OPERATE_INTERVAL_SECONDS:-3600}"
while true; do
  echo "== $(date -u +%Y-%m-%dT%H:%M:%SZ) bootstrap =="
  python3 run.py bootstrap || true
  echo "== $(date -u +%Y-%m-%dT%H:%M:%SZ) status =="
  python3 run.py status || true
  echo "== $(date -u +%Y-%m-%dT%H:%M:%SZ) improve =="
  python3 run.py improve || true
  echo "== $(date -u +%Y-%m-%dT%H:%M:%SZ) content =="
  python3 run.py content || true
  echo "== $(date -u +%Y-%m-%dT%H:%M:%SZ) ppv =="
  python3 run.py ppv || true
  echo "sleep ${INTERVAL_SECONDS}s"
  sleep "$INTERVAL_SECONDS"
done
