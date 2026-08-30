# Agent workflows (Phase 0)

Open **this file first** when you need to operate Funny Kite. Standing orders stay in `MICHAEL.md`. Stale numbers live in `STATE.md`. The live automation is `../fanvue-automation/`, not a second product.

Machine index: `workflows.json` (`python3 run.py workflows` from `fanvue-automation/`).

## Hard refusals

Do not create, run, or extend workflows for:

- NSFW / lingerie / nude / bikini generation
- Face-swap / putting a face on reference bodies
- Higgsfield / Kling / Nano Banana / ComfyUI on this Cloud Agent VM
- Instagram / TikTok / Reddit / X farms or posting
- Augustus-style multi-account
- Scraping other creators or websites for a viral vault
- Enabling ChatMate or TrafficAgent before 10 subscribers
- Metadata stripping / policy evasion

If asked: refuse and point at the trial link in `STATE.md`.

## Shared setup

```bash
cd fanvue-automation
```

Needs (gitignored, never commit):

- `tokens.json` — Fanvue OAuth (desk: Login + Save tokens)
- `.env` — `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID`
- `progress.json` — last scoreboard (written by `status` / analytics)

Python: `python3 run.py <cmd>` from `fanvue-automation/`. Same as `MICHAEL.md`.

There is **no** GitHub Action for Telegram. Repo has no documented `TELEGRAM_*` GH secrets. Hourly notify is `scripts/operate_loop.sh` on this VM (Cloud Agent terminal `phase0-operate`). Owner chat is `scripts/telegram_loop.sh` (terminal `phase0-telegram`).

---

## 1. Telegram status update

What the last successful send did: a Phase 0 scoreboard (`format_status` via `send_status`). While subscribers are under 10, analytics also sends the share kit (`format_share`) **once per UTC day**.

Typical scoreboard text:

```
Funny Kite — Phase 0
Handle: @funny-kite-83
Subs: 0/10
Followers: 0
Earnings: $3.99
Page: https://www.fanvue.com/funny-kite-83
Free trial (7 days, 0/10): https://www.fanvue.com/funny-kite-83?free_trial=…
Posts listed: 37
…
```

Typical share text (status nudge or `python3 run.py share`): public page, trial uses, “text 10 people”, clothed intro reminder, copy-paste caption + trial URL. Ads and TrafficAgent stay off.

### Steps

1. `cd fanvue-automation`
2. `python3 run.py status`
3. Optional extra share (same kit, no albums): `python3 run.py share`

### Success

- Exit `0`. Exit `2` = Fanvue auth broken (Telegram still gets an Auth: BLOCKED line).
- stdout JSON includes `subscribers`, `followers`, `public_url`.
- `progress.json` rewritten with `at`.
- Telegram: `{"ok": true, "message_id": …}` in the CLI log (`telegram …`).
- Do not post to Reddit / X / TikTok / Instagram.

---

## 2. Telegram clothed kit resend

Existing `content_bank/` only. Does not generate images. Does not post off-platform.

### Steps

1. `cd fanvue-automation`
2. `python3 run.py kit`

Same action from Telegram: `/kit`.

### Success

- Exit `0`.
- stdout: `"intro": {"ok": true}` and every `"albums"[].telegram.ok` is true.
- Sets (existing prefixes only): glam / life / casual / looks-b (`body2-`) / looks-a (`body-`).
- Intro message is the bio paste + captions + trial. Then Telegram albums (long-press → save → owner posts on **their** IG / Snap / WhatsApp).

If the bank is empty, intro may still send; albums will be empty — do not invent files or run a generator.

---

## 3. Hourly operate loop

Already implemented. Do not replace with n8n or a GH cron.

Order each hour: **bootstrap → status → improve → content → ppv**. ChatMate, ads, TrafficAgent stay off.

### Steps

1. Prefer the Cloud Agent terminal `phase0-operate` (`.cursor/environment.json`).
2. Or:

```bash
cd fanvue-automation
bash scripts/operate_loop.sh
```

Faster local cycle (do not use as the production hour):

```bash
OPERATE_INTERVAL_SECONDS=120 bash scripts/operate_loop.sh
```

One-shot (no sleep):

```bash
cd fanvue-automation
python3 run.py bootstrap
python3 run.py status
python3 run.py improve
python3 run.py content
python3 run.py ppv
```

`ppv` no-ops until files exist in `ppv_bank/` **and** the money gate allows it. Do not generate Pack 2–4 on this VM.

### Success

- Log lines `== … bootstrap ==` through `== … ppv ==`, then `sleep 3600s`.
- Failures are `|| true` so the loop stays up. Fix auth if every step errors.
- `config.yaml`: `chat.enabled` and `traffic.enabled` remain `false` in Phase 0.

---

## 4. Telegram listen / operator

Owner-only private chat. Any unknown text still gets the trial share kit.

Commands: `/status` `/share` `/kit` `/improve` (`/start` `/help` = help + share).

### Steps

1. Prefer Cloud Agent terminal `phase0-telegram`.
2. Or:

```bash
cd fanvue-automation
bash scripts/telegram_loop.sh
```

Foreground (no restart wrapper): `python3 run.py listen`

First-time chat id (owner taps `/start` on the bot, then):

```bash
cd fanvue-automation
python3 run.py telegram
```

That writes `TELEGRAM_CHAT_ID` into gitignored `.env`. Never print the bot token.

### Success

- Log: `telegram operator listening`.
- Loop restarts 3s after a crash.
- Other chats ignored. No Reddit / X / TikTok / Instagram posts.

---

## 5. Improve agent

Measure last snapshot → score the open experiment → one **safe** next act. Cannot text friends or film an intro.

### Steps

1. `cd fanvue-automation`
2. Prefer a fresh snapshot: `python3 run.py status`
3. `python3 run.py improve`

Same from Telegram: `/improve`. Hourly loop already runs this after status.

Safe `action.kind` values: `intro_nudge`, `share_variant`, `rotate_welcome`, `pack_nudge`, `hold`, `phase1_ready`.

### Success

- Exit `0`. JSON `"forbidden": false`.
- `action.kind` is one of the safe values above — never `traffic`, `reddit`, `x`, `tiktok`, `instagram`, `chat_enable`.
- Telegram gets the improve recap (and share/intro/pack copy when that is the act).
- `progress.json` gains `improve_kind` / `improve_reason` / `improve_variant`.
- `improve_memory.json` is gitignored. Do not commit it.

At 10 subscribers, `phase1_ready` **proposes** ChatMate. You still wait for the human before flipping `chat.enabled`. TrafficAgent stays off.

---

## 6. Check live Fanvue numbers and report them

Live numbers come from the Fanvue API through AnalyticsAgent. Do not scrape the public page. Do not scrape other creators.

### Live (preferred)

```bash
cd fanvue-automation
python3 run.py status
```

Report from stdout / the new `progress.json` (not from memory):

| Field | Meaning |
| --- | --- |
| `subscribers` | vs target 10 |
| `followers` | 0 means share the trial |
| `trial_used` / `trial_max` | reuse the same official link |
| `video_count` | `0` = Discover gap (human films 15–30s clothed intro) |
| `earnings_cents` | e.g. 399 → $3.99 |
| `posts_listed` / `leftover_teasers` / `bank` | feed vs vault |
| `share_note` | owner-facing next step |

Then refresh `STATE.md` from that snapshot if you are updating the handbook. **Do not commit** `progress.json`, `tokens.json`, or `.env`.

Desk (port 3456) reads the same `progress.json` via `src/lib/progressOnDisk.ts`. Browser login is a second source when the session is valid.

### Offline / stale

If auth is broken (`FanvueAuthError`, exit 2):

1. Read `fanvue-automation/progress.json` if present — label it **stale** (`at`).
2. Else quote `STATE.md` and say it is stale.
3. Tell the human: Login with Fanvue on the desk, then Save tokens. Do not store passwords in hive memory.

`python3 run.py analytics` is the same snapshot without the CLI wrapper; `status` is the operator path (prints + Telegram).

---

## After any workflow

1. Do not enable `chat.enabled` or `traffic.enabled` in `../config.yaml`.
2. Do not start a second token refresher.
3. Escalate to the human: intro video, texting 10 friends, dropping `pack1-*` files.
4. Secrets stay out of git and out of Telegram text.
