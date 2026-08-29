#!/usr/bin/env bash
# /status — Vercel Doctor. Read-only. Does not fall back to GitHub Actions.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [ ! -f .vercel/project.json ]; then
  echo "This project is not linked to Vercel. Run \`vercel link\` to connect it, then re-run /status."
  echo "The Vercel CLI is the only authoritative source for this command."
  exit 2
fi

if ! command -v vercel >/dev/null 2>&1; then
  echo "vercel CLI is not on PATH. Install with: npm i -g vercel"
  exit 2
fi

echo "## Vercel Doctor — Project Status"
echo
vercel ls || true
echo
vercel env ls || true
echo
vercel domains ls || true
