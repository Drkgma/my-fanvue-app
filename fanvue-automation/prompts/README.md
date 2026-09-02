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
