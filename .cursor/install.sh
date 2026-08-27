#!/usr/bin/env bash
# Idempotent Cloud Agent install: refresh dependencies and ensure local dev config exists.
set -euo pipefail

cd "$(dirname "$0")/.."

# pnpm is pinned via package.json "packageManager"; make sure corepack can shim it.
corepack enable >/dev/null 2>&1 || true

pnpm install --frozen-lockfile

# The app validates OAuth/session env vars at load time (src/env.ts via @t3-oss/env-nextjs),
# so it cannot boot without them. Seed development defaults when no local env exists.
# Real Fanvue OAuth completion requires genuine credentials from the Fanvue Developer Area;
# drop them into .env.local (or Cloud Agent secrets) to exercise a live login.
if [ ! -f .env.local ]; then
  cat > .env.local <<'EOF'
OAUTH_CLIENT_ID=dev-client-id
OAUTH_CLIENT_SECRET=dev-client-secret
OAUTH_SCOPES=read:self
OAUTH_REDIRECT_URI=http://localhost:3000/api/oauth/callback
OAUTH_ISSUER_BASE_URL=https://auth.fanvue.com
API_BASE_URL=https://api.fanvue.com
SESSION_SECRET=dev-session-secret-change-me-please
SESSION_COOKIE_NAME=fanvue_oauth
BASE_URL=http://localhost:3000
EOF
  echo "Created .env.local with development defaults."
else
  echo ".env.local already present; leaving it untouched."
fi
