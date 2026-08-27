# Prompt pack (one prompt per line)

Use these with a ComfyUI CR Prompt List node later, or paste them into
any image tool. Prefix every character prompt with the text in
`identity.txt`.

Identity stills (gitignored):

- `datasets/identity/face-source.png` — face lock
- `datasets/identity/body-source.webp` — body lock

Public teasers combine both: same face, hourglass body, fitted black
t-shirt and dark jeans. The body source itself is not uploaded.

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

Lingerie, thong, and nude recreations of the body sheet are blocked
by the image tool here and must not go in `content_bank/`.

## After OAuth works

```bat
python run.py content
python run.py status
```

ContentAgent uploads up to 20 new bank files and publishes 5 teasers.
Running it twice will not re-upload the same file.
