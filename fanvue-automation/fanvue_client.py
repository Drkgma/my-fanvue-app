"""Fanvue OAuth 2.0 + PKCE client. All agent HTTP goes through this module."""

from __future__ import annotations

import base64
import hashlib
import json
import math
import os
import secrets
import threading
import time
import urllib.parse
import webbrowser
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path
from typing import Any

import requests
from dotenv import dotenv_values, load_dotenv

API_BASE = "https://api.fanvue.com"
API_VERSION = "2025-06-26"
ISSUER = "https://auth.fanvue.com"
ROOT = Path(__file__).resolve().parent
REPO_ROOT = ROOT.parent
TOKEN_PATH = ROOT / "tokens.json"
DEFAULT_SCOPES = "openid offline_access offline"
PHASE0_SCOPES = (
    "read:self read:chat write:chat read:post write:post "
    "read:media write:media read:creator write:creator"
)
_FILE_WINS_IF_LONGER = (
    "OAUTH_CLIENT_SECRET",
    "OAUTH_CLIENT_ID",
    "FANVUE_TOKEN",
    "FANVUE_REFRESH_TOKEN",
)

load_dotenv(REPO_ROOT / ".env.local")
load_dotenv(REPO_ROOT / ".env")
load_dotenv(ROOT / ".env")


def prefer_longer_file_secrets() -> None:
    """Cursor may inject a truncated OAUTH_CLIENT_SECRET. Prefer a longer file value."""
    for path in (REPO_ROOT / ".env.local", REPO_ROOT / ".env", ROOT / ".env"):
        if not path.exists():
            continue
        values = dotenv_values(path)
        for key in _FILE_WINS_IF_LONGER:
            file_val = (values.get(key) or "").strip()
            env_val = (os.getenv(key) or "").strip()
            if file_val and (not env_val or len(file_val) > len(env_val)):
                os.environ[key] = file_val


prefer_longer_file_secrets()


class FanvueAuthError(RuntimeError):
    """OAuth or token failure. Callers must not swallow this."""


class FanvueApiError(RuntimeError):
    """Non-auth Fanvue API failure."""

    def __init__(self, status: int, body: str, path: str) -> None:
        self.status = status
        self.body = body
        self.path = path
        super().__init__(f"{status} on {path}: {body[:500]}")


def _b64url(raw: bytes) -> str:
    return base64.urlsafe_b64encode(raw).rstrip(b"=").decode("ascii")


def generate_pkce() -> tuple[str, str]:
    """Return (verifier, S256 challenge)."""
    verifier = _b64url(secrets.token_bytes(32))
    challenge = _b64url(hashlib.sha256(verifier.encode("ascii")).digest())
    return verifier, challenge


def seed_tokens_from_env(token_path: Path | None = None) -> Path | None:
    """Write tokens.json from FANVUE_TOKEN secrets. Returns the path if written."""
    access = (os.getenv("FANVUE_TOKEN") or "").strip()
    if not access:
        return None
    path = Path(token_path) if token_path else TOKEN_PATH
    expires_raw = (os.getenv("FANVUE_TOKEN_EXPIRES_AT") or "0").strip()
    try:
        expires_at = int(expires_raw or "0")
    except ValueError:
        expires_at = 0
    payload = {
        "access_token": access,
        "refresh_token": (os.getenv("FANVUE_REFRESH_TOKEN") or "").strip() or None,
        "token_type": "Bearer",
        "expires_at": expires_at,
    }
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    try:
        os.chmod(path, 0o600)
    except OSError:
        pass
    return path


def _load_env_credentials() -> dict[str, str]:
    client_id = os.getenv("OAUTH_CLIENT_ID") or os.getenv("FANVUE_CLIENT_ID") or ""
    client_secret = os.getenv("OAUTH_CLIENT_SECRET") or os.getenv("FANVUE_CLIENT_SECRET") or ""
    redirect_uri = (
        os.getenv("FANVUE_AGENT_REDIRECT_URI")
        or "http://localhost:8765/callback"
    )
    scopes = os.getenv("OAUTH_SCOPES") or PHASE0_SCOPES
    issuer = os.getenv("OAUTH_ISSUER_BASE_URL") or ISSUER
    return {
        "client_id": client_id,
        "client_secret": client_secret,
        "redirect_uri": redirect_uri,
        "scopes": scopes,
        "issuer": issuer,
    }


def _basic_auth(client_id: str, client_secret: str) -> str:
    raw = f"{client_id}:{client_secret}".encode("utf-8")
    return "Basic " + base64.b64encode(raw).decode("ascii")


class FanvueClient:
    """Authenticated Fanvue REST client with token refresh and media upload."""

    def __init__(
        self,
        token_path: Path | None = None,
        session: requests.Session | None = None,
    ) -> None:
        self.token_path = Path(token_path) if token_path else TOKEN_PATH
        self.session = session or requests.Session()
        self._tokens: dict[str, Any] = {}
        self._load_tokens()

    def _load_tokens(self) -> None:
        env_token = os.getenv("FANVUE_TOKEN")
        if env_token:
            self._tokens = {
                "access_token": env_token,
                "refresh_token": os.getenv("FANVUE_REFRESH_TOKEN"),
                "expires_at": int(os.getenv("FANVUE_TOKEN_EXPIRES_AT") or "0"),
            }
            return
        if self.token_path.exists():
            self._tokens = json.loads(self.token_path.read_text(encoding="utf-8"))

    def save_tokens(self, tokens: dict[str, Any]) -> None:
        """Persist tokens to disk. Never commit this file."""
        self._tokens = tokens
        self.token_path.parent.mkdir(parents=True, exist_ok=True)
        self.token_path.write_text(json.dumps(tokens, indent=2), encoding="utf-8")
        try:
            os.chmod(self.token_path, 0o600)
        except OSError:
            pass

    def access_token(self) -> str:
        """Return a valid access token, refreshing if it expires within 30s."""
        token = self._tokens.get("access_token")
        if not token:
            raise FanvueAuthError(
                "No Fanvue token. Login in the Next.js app and download tokens.json, "
                "or run: python run.py login"
            )
        expires_at = int(self._tokens.get("expires_at") or 0)
        if expires_at and time.time() * 1000 >= expires_at - 30_000:
            self.refresh()
            token = self._tokens.get("access_token")
            if not token:
                raise FanvueAuthError("Token refresh cleared the access token.")
        return str(token)

    def refresh(self) -> None:
        """Rotate the access token using the stored refresh token."""
        refresh_token = self._tokens.get("refresh_token")
        if not refresh_token:
            raise FanvueAuthError("Access token expired and no refresh_token is stored.")
        creds = _load_env_credentials()
        if not creds["client_id"] or not creds["client_secret"]:
            raise FanvueAuthError("OAUTH_CLIENT_ID / OAUTH_CLIENT_SECRET required to refresh.")
        response = requests.post(
            f"{creds['issuer']}/oauth2/token",
            headers={
                "Content-Type": "application/x-www-form-urlencoded",
                "Authorization": _basic_auth(creds["client_id"], creds["client_secret"]),
            },
            data={
                "grant_type": "refresh_token",
                "refresh_token": refresh_token,
                "client_id": creds["client_id"],
            },
            timeout=30,
        )
        if not response.ok:
            raise FanvueAuthError(f"Token refresh failed: {response.status_code} {response.text}")
        payload = response.json()
        self.save_tokens(
            {
                "access_token": payload["access_token"],
                "refresh_token": payload.get("refresh_token") or refresh_token,
                "token_type": payload.get("token_type"),
                "scope": payload.get("scope"),
                "expires_at": int(time.time() * 1000) + int(payload.get("expires_in", 3600)) * 1000,
            }
        )

    def request(
        self,
        method: str,
        path: str,
        *,
        params: dict[str, Any] | None = None,
        json_body: dict[str, Any] | None = None,
        timeout: int = 60,
    ) -> Any:
        """Send an authenticated JSON request. Raises FanvueAuthError on 401."""
        url = path if path.startswith("http") else f"{API_BASE}{path}"
        headers = {
            "Authorization": f"Bearer {self.access_token()}",
            "X-Fanvue-API-Version": API_VERSION,
            "Content-Type": "application/json",
        }
        response = self.session.request(
            method,
            url,
            params=params,
            json=json_body,
            headers=headers,
            timeout=timeout,
        )
        if response.status_code == 401:
            raise FanvueAuthError(f"Unauthorized on {path}: {response.text}")
        if response.status_code == 429:
            retry_after = int(response.headers.get("Retry-After") or "5")
            time.sleep(retry_after)
            return self.request(method, path, params=params, json_body=json_body, timeout=timeout)
        if not response.ok:
            raise FanvueApiError(response.status_code, response.text, path)
        if not response.content:
            return {}
        if response.headers.get("Content-Type", "").startswith("text/plain"):
            return response.text
        return response.json()

    def get_me(self) -> dict[str, Any]:
        """GET /users/me."""
        return self.request("GET", "/users/me")

    def get_account(self) -> dict[str, Any]:
        """GET /users/account — subscribers, followers, earnings."""
        return self.request("GET", "/users/account")

    def list_posts(self, page: int = 1, size: int = 15) -> dict[str, Any]:
        """GET /posts."""
        return self.request("GET", "/posts", params={"page": page, "size": size})

    def list_media(self, page: int = 1, size: int = 15) -> dict[str, Any]:
        """GET /media."""
        return self.request("GET", "/media", params={"page": page, "size": size})

    def get_media(self, media_uuid: str) -> dict[str, Any]:
        """GET /media/{uuid}."""
        return self.request("GET", f"/media/{media_uuid}")

    def create_post(
        self,
        *,
        audience: str,
        text: str | None = None,
        media_uuids: list[str] | None = None,
        price: int | None = None,
        media_preview_uuid: str | None = None,
        publish_at: str | None = None,
    ) -> dict[str, Any]:
        """POST /posts. *price* is USD cents, min 300 when set."""
        body: dict[str, Any] = {"audience": audience}
        if text is not None:
            body["text"] = text
        if media_uuids:
            body["mediaUuids"] = media_uuids
        if price is not None:
            body["price"] = price
        if media_preview_uuid:
            body["mediaPreviewUuid"] = media_preview_uuid
        if publish_at:
            body["publishAt"] = publish_at
        return self.request("POST", "/posts", json_body=body)

    def list_unread_chats(self, page: int = 1, size: int = 50) -> dict[str, Any]:
        """GET /chats?filter=unread."""
        return self.request("GET", "/chats", params={"filter": "unread", "page": page, "size": size})

    def get_messages(self, user_uuid: str, mark_as_read: bool = False) -> dict[str, Any]:
        """GET /chats/{userUuid}/messages."""
        return self.request(
            "GET",
            f"/chats/{user_uuid}/messages",
            params={"size": 15, "markAsRead": "true" if mark_as_read else "false"},
        )

    def send_message(
        self,
        user_uuid: str,
        text: str,
        *,
        media_uuids: list[str] | None = None,
        price: int | None = None,
    ) -> dict[str, Any]:
        """POST /chats/{userUuid}/message."""
        body: dict[str, Any] = {"text": text}
        if media_uuids:
            body["mediaUuids"] = media_uuids
        if price is not None:
            body["price"] = price
        return self.request("POST", f"/chats/{user_uuid}/message", json_body=body)

    def list_automated_messages(self) -> dict[str, Any]:
        """GET /chats/automated-messages."""
        return self.request("GET", "/chats/automated-messages")

    def upsert_automated_message(self, trigger: str, text: str, price: int | None = None) -> dict[str, Any]:
        """PUT /chats/automated-messages/{trigger}. Free messages omit price."""
        body: dict[str, Any] = {"text": text, "enabled": True}
        if price:
            body["price"] = price
        return self.request("PUT", f"/chats/automated-messages/{trigger}", json_body=body)

    def update_subscription_price(self, cents: int) -> dict[str, Any]:
        """PATCH /users/me/subscription-price."""
        return self.request("PATCH", "/users/me/subscription-price", json_body={"price": cents})

    def _part_url(self, upload_id: str, part_number: int, creator_uuid: str | None) -> str:
        encoded = urllib.parse.quote(upload_id, safe="")
        try:
            result = self.request("GET", f"/media/uploads/{encoded}/parts/{part_number}/url")
            return result if isinstance(result, str) else str(result)
        except FanvueApiError:
            if not creator_uuid:
                raise
            result = self.request(
                "GET",
                f"/creators/{creator_uuid}/media/uploads/{encoded}/parts/{part_number}/url",
            )
            return result if isinstance(result, str) else str(result)

    def upload_file(self, path: Path, media_type: str = "image") -> str:
        """Multipart-upload a local file and return the media UUID."""
        file_path = Path(path)
        size = file_path.stat().st_size
        session = self.request(
            "POST",
            "/media/uploads",
            json_body={
                "name": file_path.stem[:255],
                "filename": file_path.name[:255],
                "mediaType": media_type,
                "sizeBytes": size,
            },
        )
        media_uuid = session["mediaUuid"]
        upload_id = session["uploadId"]
        part_size = int(session["partSize"])
        total_parts = session.get("totalParts") or math.ceil(size / part_size)
        me = self.get_me()
        creator_uuid = me.get("uuid")
        parts: list[dict[str, Any]] = []
        with file_path.open("rb") as handle:
            for part_number in range(1, int(total_parts) + 1):
                chunk = handle.read(part_size)
                url = self._part_url(upload_id, part_number, creator_uuid)
                put = requests.put(url, data=chunk, timeout=120)
                put.raise_for_status()
                etag = (put.headers.get("ETag") or "").strip().strip('"')
                parts.append({"ETag": etag, "PartNumber": part_number})
        self.request("PATCH", f"/media/uploads/{urllib.parse.quote(upload_id, safe='')}", json_body={"parts": parts})
        return str(media_uuid)

    def wait_until_media_ready(self, media_uuid: str, timeout_s: int = 120) -> dict[str, Any]:
        """Poll GET /media/{uuid} until status is ready or *timeout_s* elapses."""
        deadline = time.time() + timeout_s
        last: dict[str, Any] = {}
        while time.time() < deadline:
            last = self.get_media(media_uuid)
            status = str(last.get("status") or last.get("mediaStatus") or "")
            if status.lower() in {"ready", "available", "processed"}:
                return last
            if status.lower() in {"error", "failed"}:
                raise FanvueApiError(400, f"media {media_uuid} failed processing", f"/media/{media_uuid}")
            time.sleep(2)
        return last


def login_interactive(token_path: Path | None = None) -> Path:
    """Run the authorization-code + PKCE flow on localhost:8765."""
    creds = _load_env_credentials()
    if not creds["client_id"] or not creds["client_secret"]:
        raise FanvueAuthError(
            "Set OAUTH_CLIENT_ID and OAUTH_CLIENT_SECRET in .env.local before login."
        )
    verifier, challenge = generate_pkce()
    state = secrets.token_urlsafe(16)
    captured: dict[str, str] = {}

    class Handler(BaseHTTPRequestHandler):
        def do_GET(self) -> None:  # noqa: N802
            parsed = urllib.parse.urlparse(self.path)
            if parsed.path != "/callback":
                self.send_response(404)
                self.end_headers()
                return
            query = urllib.parse.parse_qs(parsed.query)
            captured["code"] = (query.get("code") or [""])[0]
            captured["state"] = (query.get("state") or [""])[0]
            captured["error"] = (query.get("error") or [""])[0]
            body = b"Fanvue login complete. You can close this tab."
            self.send_response(200)
            self.send_header("Content-Type", "text/plain")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)

        def log_message(self, format: str, *args: Any) -> None:  # noqa: A003
            return

    parsed_redirect = urllib.parse.urlparse(creds["redirect_uri"])
    host = parsed_redirect.hostname or "127.0.0.1"
    port = parsed_redirect.port or 8765
    server = HTTPServer((host, port), Handler)
    thread = threading.Thread(target=server.handle_request, daemon=True)
    thread.start()

    params = {
        "response_type": "code",
        "client_id": creds["client_id"],
        "redirect_uri": creds["redirect_uri"],
        "scope": f"{DEFAULT_SCOPES} {creds['scopes']}",
        "state": state,
        "code_challenge": challenge,
        "code_challenge_method": "S256",
        "prompt": "login",
    }
    auth_url = f"{creds['issuer']}/oauth2/auth?{urllib.parse.urlencode(params)}"
    webbrowser.open(auth_url)
    thread.join(timeout=180)
    server.server_close()
    if captured.get("error"):
        raise FanvueAuthError(f"Login denied: {captured['error']}")
    if not captured.get("code") or captured.get("state") != state:
        raise FanvueAuthError("Login did not return a valid authorization code.")

    response = requests.post(
        f"{creds['issuer']}/oauth2/token",
        headers={
            "Content-Type": "application/x-www-form-urlencoded",
            "Authorization": _basic_auth(creds["client_id"], creds["client_secret"]),
        },
        data={
            "grant_type": "authorization_code",
            "code": captured["code"],
            "redirect_uri": creds["redirect_uri"],
            "client_id": creds["client_id"],
            "code_verifier": verifier,
        },
        timeout=30,
    )
    if not response.ok:
        raise FanvueAuthError(f"Token exchange failed: {response.status_code} {response.text}")
    payload = response.json()
    dest = Path(token_path) if token_path else TOKEN_PATH
    client = FanvueClient(token_path=dest)
    client.save_tokens(
        {
            "access_token": payload["access_token"],
            "refresh_token": payload.get("refresh_token"),
            "token_type": payload.get("token_type"),
            "scope": payload.get("scope"),
            "expires_at": int(time.time() * 1000) + int(payload.get("expires_in", 3600)) * 1000,
        }
    )
    return dest
