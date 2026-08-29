# Generation stack (owner's PC and paid clouds)

These tools belong to the **human's machine and accounts**, not the Cloud Agent CPU VM.

Munder agents may **document, queue, and operate** them when the human is on that PC. They must not pretend the Cloud Agent can run ComfyUI, RunPod GPUs, or Higgsfield from this Linux VM.

## Allowed now (Phase 0)

Use only for **SFW, fully clothed** Funny Kite teasers (same face lock, girl-next-door). Same rules as `content_bank/`.

| Tool | Use |
| --- | --- |
| **ComfyUI** | Local graph for clothed stills. No nude/lingerie checkpoints for the public feed. No LoRA training on this Cloud VM. |
| **RunPod** | GPU box the human pays for. Same SFW rule for anything destined for Fanvue public posts. |
| **MiniMax** | Image/video APIs the human already has. Clothes-on teasers and Pack 1 “Instagram-sexy, not nude” only until 10 subs. |
| **Seedance 2.0** | Short motion / video. Clothed intro-style or tease clips. No sex clips for the free feed. |
| **Higgsfield** | Image/video the human subscribed to. Same SFW public-feed rule. |

Also named in past chats (same gates): Klein, Qwen, Nano Banana. Treat as “owner GPU only,” never Cloud Agent CPU.

## Pack 1 vs Packs 2–4

- **Pack 1 ($9):** Instagram-sexy, not nude. Owner stack may help if the human asks for a named `pack1-*` file.
- **Packs 2–4:** Lingerie / half nudes / nudes. Prefer the human filming. If they insist on ComfyUI/RunPod/Higgsfield/MiniMax/Seedance for a **specific filename**, they must be at the keyboard. Do not batch-generate a porn library. Do not train a LoRA on stolen photos.

## Never

- Nudes, lingerie, or sex clips on the **public** Fanvue feed or off-platform socials.
- Training identity LoRAs on this Cloud Agent.
- Posting outputs to Reddit, X, TikTok, Instagram, Threads, or dating apps.
- Leak sites, other creators' faces or videos, “teen” coded niches.
- ElevenLabs / Mistral “spicy closer” ChatMate before 10 subscribers.
- Grok Bot 9-stream SEO / lead / KDP / Pinterest farms.

## Where finished SFW files go

1. Stills → `../fanvue-automation/content_bank/`
2. Pack files → `../fanvue-automation/ppv_bank/` with the right prefix
3. Then the existing Python agents upload. Do not invent a second poster.

## Secrets

API keys for RunPod, MiniMax, Higgsfield, ComfyUI, OpenRouter stay in the human's env or Munder secret broker — never in this git repo, never in hive markdown.
