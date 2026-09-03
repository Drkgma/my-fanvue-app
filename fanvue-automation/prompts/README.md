# Prompt pack (one prompt per line)

Use these with a ComfyUI CR Prompt List node later, or paste them into
any image tool. Prefix every character prompt with the text in
`identity.txt`.

Identity stills (gitignored):

- `datasets/identity/face-source.png` — face lock
- `datasets/identity/body-source.jpg` / `body-source.webp` — primary body lock
- `datasets/identity/body-refs/` — extra body sheets (private)

Public teasers combine face + hourglass body in fully clothed outfits
(t-shirt and jeans, midi dress, sundress, white shirt and trousers,
evening gown). Identity sheets themselves are not uploaded.

The first lip-sync Reel lives in `reels/`. Paste `obsessed-outcome.teaser.json`
into VEO 3 / Flow at 9:16. The PPV bikini JSON is not a public teaser.

`teaser_prompts_vol2.txt` is 51 RAW iPhone stills (reference images only,
handheld or tripod). Generated files: `content_bank/teaser-v2-01.png` … `51`.

`content_secrets_sfw.md` applies the 2022 content-guide rules (window light,
room swaps, 45° angles, curiosity captions, file names) at Phase 0.
`script_teaser_map.txt` is the dressed preview half of Scripts 1–10.
`curiosity_captions.txt` is paste-ready PPV/teaser copy. Stills from this
pass are `guide-*-01` under `/opt/cursor/artifacts/` — not the public bank.
`private_now_captions.txt` matches 16 more private stills (`private-now-01` … `16`).
`lounge_blue_halter.txt` is a private 9:16 indoor wrap-halter still
(`lounge-blue-halter-01`). Keep it out of `content_bank/`.
`pose_pack_220.txt` is 220 private clothed pose lines for the locked
face. Generated stills `pose-pack-001` … `024` stay in the private folder.
`reddit_promo_sfw.txt` is SFW promo copy pointing at
https://www.fanvue.com/funny-kite-83. TrafficAgent stays off.

## What this agent can and cannot do

This Cloud Agent VM has no NVIDIA GPU. It cannot download or run:

- FLUX.2 Klein 9B
- Qwen Image 2512
- Z-Image Base / Turbo
- Klein character LoRA training

Those weights are tens of gigabytes and need a local GPU or RunPod.
When you have a GPU box, point ComfyUI at the prompt files plus the
two identity stills above.

## Public teasers vs later PPV

Phase 0 posts go to `followers-and-subscribers`. Keep them SFW:
plain shirts, jeans, lifestyle rooms.

Lingerie, thong, bikini, and nude recreations of the extra body sheets
are blocked by the image tool here and must not go in `content_bank/`.
Keep `obsessed-outcome.ppv.json` as a later-phase prompt only.

## After OAuth works

```bat
python run.py content
python run.py status
python scripts/print_reel_prompt.py teaser
python scripts/render_obsessed_reel.py
```

ContentAgent uploads up to 20 new bank files and publishes 5 teasers.
Running it twice will not re-upload the same file.
