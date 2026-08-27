# Fanvue automation (Phase 0)

This is not a $1M/month engine. The account is around **1 subscriber**.
The only milestone that matters is **10 subscribers**.

Python agents live here. The Next.js app in the repo root is still the
browser OAuth login. After you log in, download `tokens.json` from the
home page and drop it in this folder (gitignored).

## This week (Phase 0)

1. Register redirect URIs on the Fanvue app:
   - `http://localhost:3000/api/oauth/callback`
   - `http://localhost:8765/callback` (optional Python login)
2. Request scopes: `read:self read:chat write:chat read:post write:post read:media write:media read:creator write:creator`
3. Copy `.env.example` → `.env.local` in the repo root and fill client id/secret.
4. `pnpm dev`, click **Login with Fanvue**, then **Save tokens for local agents**.
5. Put up to 20 images in `content_bank/` (SFW teasers are enough to start).
6. `python run.py content` then `python run.py status`.

Do not enable ChatMate, MoneyBot, TrafficAgent, ads, or extra personas
until auth works and those 5 teasers are live.

## Commands

```bat
python -m pip install -r requirements.txt
python run.py login
python run.py content
python run.py daily
run_daily.bat
```

`run_daily.bat` is a Windows cmd script. Keep it.

## Phase gate

`config.yaml` at the repo root sets `phase: 0`. Chat and money stay
disabled until you set `phase: 1` and `chat.enabled` / `money.enabled`.
TrafficAgent always no-ops before phase 2.

## ComfyUI / FLUX

Generate images however you want. This agent does not run ComfyUI.
Drop finished files into `content_bank/`.
