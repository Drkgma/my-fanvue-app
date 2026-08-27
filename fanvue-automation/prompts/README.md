# Prompt pack (one prompt per line)

Use these with a ComfyUI CR Prompt List node later, or paste them into
any image tool. Prefix every character prompt with the text in
`identity.txt`.

## What this agent can and cannot do

This Cloud Agent VM has no NVIDIA GPU. It cannot download or run:

- FLUX.2 Klein 9B
- Qwen Image 2512
- Z-Image Base / Turbo
- Klein character LoRA training

Those weights are tens of gigabytes and need a local GPU or RunPod.
When you have a GPU box, point ComfyUI at the same prompt files and
the identity still in `content_bank/00-identity-source.png`.

Here, stills were generated with Cursor image gen from that identity
photo, then staged into `content_bank/` (character) and
`datasets/rooms/` (empty rooms).

## Public teasers vs later PPV

Phase 0 posts go to `followers-and-subscribers`. Keep them SFW:
plain shirts, lifestyle rooms, face-consistent portraits.

Tube-top, lingerie, and nude prompts were blocked by the image tool
on this agent. Do not try to route around that with face-swap onto
content you do not own.

## After OAuth works

```bat
python run.py content
python run.py status
```

ContentAgent uploads up to 20 new bank files and publishes 5 teasers.
Running it twice will not re-upload the same file.
