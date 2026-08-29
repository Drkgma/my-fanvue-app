# Fanvue Automation — Cursor Agent Instructions

Copy this folder to your Desktop. These are the standing orders for Cursor / Michael.

## Mandate: realistic goals only

- NEVER entertain $1M/month fantasies with a beginner account.
- Current state: ~1 subscriber. First milestone: **10 subscribers**.
- Validate every feature against: *"Does this help get from 1 → 10 → 50 → 100 subscribers?"*
- If a request is delusional (e.g., "scale to $1M this month"), push back politely and redirect to the current phase.

## Growth ladder

| Phase | Timeline | Revenue Target | Subscriber Target | Focus |
|-------|----------|----------------|-------------------|-------|
| Phase 0 | Now | $5/mo | 1 → 10 | Fix auth, upload content, post teasers |
| Phase 1 | Month 1 | $500–$1,000 | 35–70 | ContentAgent + ChatMate + MoneyBot, daily posts |
| Phase 2 | Month 3 | $3,000–$5,000 | 200–400 | Daily PPV, SFW Reddit + TikTok teasers only |
| Phase 3 | Month 6 | $8,000–$15,000 | 600–1,000 | Tiered pricing, custom content |
| Phase 4 | Month 12 | $20,000–$40,000 | 1,500–3,000 | Full automation |
| Phase 5 | Month 24+ | $50,000–$100,000 | 5,000+ | Extra personas (not now) |

**Rule:** Only build for the current phase + one phase ahead. No empire-building in Phase 0.

## 24-hour rule

1. Fix auth (Fanvue OAuth must work end-to-end)
2. Upload 20 images (content bank is king)
3. Post 5 teasers (`followers-and-subscribers`)
4. ChatMate + MoneyBot only after phase is 1

## Forbidden

- Paid ads before organic traction
- NFT / merch / SaaS-for-others
- Reddit / X / TikTok / Threads / dating-app farms
- Mother/slave Instagram bots, stolen captions, leak sites
- Deleting `.bat` files (they are Windows cmd scripts)
- Swallowing auth errors

## Commands

From `fanvue-automation/`:

- `python run.py status` — scoreboard
- `python run.py share` — writes `share_kit/SHARE.txt` and pings Telegram if configured
- `python run.py kit` — writes `share_kit/KIT.txt` (photos stay in `content_bank/`)
- `python run.py content` — upload ≤20, post ≤5 teasers
- `python run.py improve` — next safe Phase 0 act

Trial: https://www.fanvue.com/funny-kite-83?free_trial=b31468d1-0986-402f-9915-e7015e933c21
