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
6. `python run.py telegram` then `python run.py content` then `python run.py status`.

Telegram: set `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` in gitignored
`fanvue-automation/.env`. `python run.py telegram` discovers the chat id
after you tap /start on @drkgma78bot. Status, content, and daily runs
send a scoreboard there. Never commit the bot token.

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

## Image gen (Phase 0)

This agent does not run ComfyUI, Klein, Qwen, or Z-Image. There is no
GPU on the Cloud Agent VM. Public teasers lock the face sheet to the
body sheet (fitted t-shirt + jeans) and live in `content_bank/`. Empty
rooms live in `datasets/rooms/`. Identity sheets live in
`datasets/identity/` and are never uploaded.

Prompt lists for a later GPU/ComfyUI run (one prompt per line, CR Prompt
List compatible) live in `prompts/`. Re-stage new stills with:

```
python scripts/stage_bank.py /path/to/generated-images
```

Public teasers stay SFW. Do not drop empty rooms or PPV stills into
`content_bank/` if you want ContentAgent to post follower teasers.
