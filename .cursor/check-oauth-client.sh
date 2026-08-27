#!/usr/bin/env bash
# Probe the Fanvue token endpoint. Prints only the error class, never secrets.
set -euo pipefail
cd "$(dirname "$0")/.."
python3 - <<'PY'
from __future__ import annotations

import base64
from pathlib import Path

import requests

env: dict[str, str] = {}
path = Path(".env.local")
if path.exists():
    for raw in path.read_text(encoding="utf-8").splitlines():
        if not raw.strip() or raw.strip().startswith("#") or "=" not in raw:
            continue
        k, v = raw.split("=", 1)
        env[k.strip()] = v.strip().strip('"').strip("'")

client_id = env.get("OAUTH_CLIENT_ID", "")
client_secret = env.get("OAUTH_CLIENT_SECRET", "")
issuer = env.get("OAUTH_ISSUER_BASE_URL", "https://auth.fanvue.com")
redirect = env.get("OAUTH_REDIRECT_URI", "http://localhost:3000/api/oauth/callback")
placeholder = client_id in {"", "dev-client-id"} or client_secret in {"", "dev-client-secret"}
auth = base64.b64encode(f"{client_id}:{client_secret}".encode()).decode()
res = requests.post(
    f"{issuer}/oauth2/token",
    headers={
        "Content-Type": "application/x-www-form-urlencoded",
        "Authorization": f"Basic {auth}",
    },
    data={
        "grant_type": "authorization_code",
        "code": "not-a-real-code",
        "redirect_uri": redirect,
        "client_id": client_id,
        "code_verifier": "x" * 43,
    },
    timeout=20,
)
body = res.text.lower()
if placeholder:
    print(f"oauth_probe placeholder_creds status={res.status_code}")
elif "invalid_client" in body:
    print(f"oauth_probe invalid_client status={res.status_code}")
elif "invalid_grant" in body or res.status_code in {400, 401}:
    print(f"oauth_probe client_accepted status={res.status_code}")
else:
    print(f"oauth_probe unexpected status={res.status_code}")
PY
