# Fanvue creator-automation — Cursor agent instructions

This repo is **Cursor-only**. Canonical instructions live here and in `.cursor/rules/*.mdc`. Do not recreate a CLAUDE.md playbook. If you are Claude Code, read `CLAUDE.md` (thin redirect) then follow this file.

## What this repo is (verified on `main`)

This is the official **Fanvue App Starter**: Next.js 16 App Router, PKCE OAuth against `https://auth.fanvue.com`, session JWT cookie, and a single Fanvue API call (`GET /users/me`). It is **not** an n8n farm, Telegram bot, analytics platform, or $1M/month machine.

| Looked for | On `main`? |
|---|---|
| `SETUP-STATUS.md` | No |
| n8n workflows | No |
| Telegram bot / webhook | No |
| Growth reports / revenue logs | No |
| `.cursor/rules` / `AGENTS.md` | This commit |
| Fanvue MCP (`fanvue` namespace) | Available in Cursor when the user authenticates the MCP; tools are empty until then |
| Live OAuth credentials | `.env.example` is empty placeholders; never commit `.env.local` |

Unmerged sibling branches exist (`cursor/setup-cloud-agent-environment-d0af`, `cursor/reel-clearance-desk-d060`). They are **not** on `main`. Do not assume Cloud Agent install scripts, the Reel Clearance Desk, playbooks, or prompt builder are in this tree unless those PRs merge or the user asks to pull them.

## Current phase (default until evidence says otherwise)

**Phase 0, entering Phase 1.** Treat the account as a beginner page (~0–1 subscriber) unless the user provides hard numbers (subscriber count, 30-day revenue, posting cadence). User ambition is not evidence.

Detect phase from the [growth ladder](.cursor/rules/growth-ladder.mdc) using repo files first, then user-stated metrics. Never from slogans.

**Build only the current phase + one phase ahead.** Refuse empire-building.

## Read these rules

| File | When |
|---|---|
| `.cursor/rules/00-operating-system.mdc` | Always — 24-hour rule, $1M refusal, tone, what to do this week |
| `.cursor/rules/growth-ladder.mdc` | Phases 0–5, realistic 3-month targets, promotion criteria |
| `.cursor/rules/agent-stack.mdc` | ContentAgent / ChatMate / MoneyBot / TrafficAgent / AnalyticsAgent — implementation order |
| `.cursor/rules/architecture.mdc` | How to change this Next.js/OAuth app; Fanvue API; secrets; no invented infra |

## This week (Phase 0) — do these, in order

1. **Prove login.** Help the creator finish Fanvue Developer App credentials, HTTPS redirect URI, and `.env.local` from `.env.example`. Success = “Login with Fanvue” returns `/users/me` JSON. Do not commit secrets.
2. **Page basics they can click today.** Bio (one line of voice + one line of what they get), promo pattern (default: 14-day free trial for new subs unless they already have a reason not to), first-impression checklist. No dashboard.
3. **ContentAgent lite (manual).** A 7-day posting plan they can execute by hand: 1 feed post or set per day, captions, SFW teaser vs Fanvue-only split. No scheduler, no multi-platform blaster.
4. **ChatMate lite (templates only).** Welcome message + 8–12 reply lines (check-in, witty, invitational). Do **not** auto-send DMs. Do **not** request chat write-scopes until login works and they are actually chatting.
5. **Stop.** That is the week. If something else is requested, apply the 24-hour rule and the phase gate.

## Refuse this week (and until Phase 1 is earned)

- $1M/month, $1M in 3 months, “get rich this quarter,” or any plan that assumes celebrity traffic
- Full 5-agent stack, MoneyBot pricing engines, TrafficAgent multi-channel, AnalyticsAgent warehouses
- n8n graphs, Telegram ops bots, VA chatter platforms, CRM, whale funnels
- Broad OAuth scopes “for later,” storing tokens in git, fake subscriber counts
- Merging or rebuilding the Instagram clearance desk unless the user is starting **one** SFW traffic channel *after* login and posting exist

## Realistic 3-month envelope (Phase 0 start)

These are **ceilings for a beginner account**, not promises. Strong execution + luck sits at the high end; most accounts sit lower. See the growth-ladder rule for month-by-month build vs refuse.

| Window | Phase | Subs (paid or converted trial) | Revenue | What “winning” looks like |
|---|---|---|---|---|
| Month 1 | 0 → 1 | 0–25 | $0–$300 | Login works, page live, posting rhythm, welcome script used |
| Month 2 | 1 | 15–60 | $100–$1,000 | One repeatable traffic source, 3-item PPV menu, lists started |
| Month 3 | 1 → 2 | 40–150 | $400–$3,000 typical; ~$5k is an outlier | Chat converts, vault labeled, re-engage templates |

**$1,000,000 in 3 months is not a target. It is a hallucination.** Encode pushback; do not write a roadmap to it.

## Commands (this starter)

```bash
pnpm install
pnpm dev      # http://localhost:3000 — Fanvue OAuth needs HTTPS + matching redirect URI
pnpm build
pnpm lint     # starter may already have lint noise; do not drive-by fix unless asked
```

OAuth setup: `README.md`. Credentials: Fanvue Developer Area. API: https://api.fanvue.com/docs

## Secrets

Never commit `.env`, `.env.local`, client secrets, access tokens, or session secrets. `.gitignore` already ignores `.env*` except `.env.example`.
