# Project memory (Claude / Cursor / Codex)

This folder is the **Munder Difflin project** for Funny Kite Fanvue.

Read first: `WORKFLOWS.md`, `MICHAEL.md`, `STATE.md`, `TOOLS.md`.

## Defaults

- Phase 0. First win: 10 subscribers.
- Public teasers: SFW, fully clothed.
- Do not enable `chat.enabled` or `traffic.enabled` in `../config.yaml`.
- Do not commit `tokens.json`, `.env*`, `jobs.db`, `progress.json`, `improve_memory.json`, or bank images.
- Do not generate nudes or train LoRA on a Cloud Agent CPU box.

## Repo map (parent of this folder)

- `../fanvue-automation/` — Python agents
- `../src/` — Phase 0 desk (Next.js)
- `../config.yaml` — phase gates

If you need to change automation code, work in the parent repo, not by copying it in here.
