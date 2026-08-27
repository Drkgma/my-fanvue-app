# Fanvue creator-automation — Cursor agent instructions

This repo is **Cursor-only**. Canonical instructions live here and in `.cursor/rules/*.mdc`. Do not recreate a CLAUDE.md playbook. If you are Claude Code, read `CLAUDE.md` (thin redirect) then follow this file.

## What this repo is

Official **Fanvue App Starter** (Next.js 16 App Router, PKCE OAuth, session JWT) plus a **Phase 0/1 creator-ops runtime** in this app:

- `/ops` dashboard (also `/setup`) — env presence, OAuth vs login, phase, agent status
- Orchestrator tick: `POST /api/ops/tick` (Vercel cron daily 14:00 UTC, or `pnpm ops:tick`)
- Five agents as **lite jobs**: drafts, checklists, local analytics. No live send/publish in Phase 0/1.

It is **not** an n8n farm, Telegram bot, or $1M/month machine.

| Looked for | In this tree? |
|---|---|
| Working OAuth login | Yes — `/api/oauth/*` |
| Creator ops dashboard | Yes — `/ops` |
| n8n / Telegram | No — do not add |
| Fanvue MCP (`fanvue` namespace) | Needs human OAuth; cloud agents skip it |
| Live client secret | `.env.local` only (gitignored). Never commit |

## Current phase

**Default: Phase 0, one ahead = Phase 1.** Detect from `GET /users/me` → `fanCounts.subscribersCount`. Unauthenticated **defaults to 1 subscriber / Phase 0**.

**Build only current phase + one ahead.** The orchestrator encodes this in `src/lib/ops/phase.ts`. Refuse empire-building.

## Read these rules

| File | When |
|---|---|
| `.cursor/rules/00-operating-system.mdc` | Always — 24-hour rule, $1M refusal, tone |
| `.cursor/rules/growth-ladder.mdc` | Phases 0–5 |
| `.cursor/rules/agent-stack.mdc` | 5 agents + implementation order |
| `.cursor/rules/architecture.mdc` | Next.js / OAuth / ops runtime |

## This week (Phase 0)

1. User registers `http://localhost:3000/api/oauth/callback` at https://fanvue.com/developers
2. User clicks **Login with Fanvue**
3. Until those two clicks: ops still demos on fixtures; jobs skip live APIs with `waiting_for_login`
4. ContentAgent lite = 7-day plan + PPV concepts. ChatMate lite = welcome + unpaid looker. MoneyBot = sub + first PPV + tip ladder. Traffic = checklist. Analytics = local log.
5. `/ops` always shows **Today’s money plan**. `pnpm ops:cycle` runs one daily tick.

## Refuse

- $1M/month, $1M in 3 months, get-rich-quick, Lambo roadmaps
- Mass DMs, auto-publish without login, scraping, spam
- n8n, Telegram, warehouses, celebrity funnels
- Expanding OAuth scopes “for later”

**$1,000,000 in 3 months is not a target. It is a hallucination.** Runtime guardrails refuse it (`src/lib/ops/guardrails.ts`).

## Realistic 3-month envelope (Phase 0 start)

| Window | Subs | Revenue | Winning looks like |
|---|---|---|---|
| Month 1 | 0–25 | $0–$300 | Login works, posting rhythm, welcome used |
| Month 2 | 15–60 | $100–$1,000 | One traffic source, 3-item PPV menu |
| Month 3 | 40–150 | $400–$3,000 typical; ~$5k outlier | Chat converts. Still not $1M. |

## Commands

```bash
pnpm install
pnpm dev              # http://localhost:3000
pnpm ops:cycle        # one daily tick (needs pnpm dev)
pnpm ops:status       # env keys present? (no values)
pnpm test
pnpm lint
pnpm build
```

Human-only: register redirect URI, then Login with Fanvue. Secrets stay in `.env.local`.
