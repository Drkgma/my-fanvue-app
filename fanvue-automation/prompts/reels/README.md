# Obsessed With The Outcome — lip-sync reel

Phase 0 Instagram / Fanvue teaser. Recreates the “I’m obsessed” lip-sync
format ([example](https://www.instagram.com/reel/CPWL_yjlQ7u/)).

Paste one JSON file into Google Flow / VEO 3 (or Higgsfield) as Text to Video.
Set **9:16**, 1080p. Add the Instagram audio yourself: **notmonica • Original Audio**.

| File | Where it goes | Outfit |
| --- | --- | --- |
| `obsessed-outcome.teaser.json` | Public Reel + `content_bank/` stills | White shirt + black trousers |
| `obsessed-outcome.ppv.json` | Later vault / PPV only | High-cut black bikini |

Do not drop PPV stills or the body identity sheet into `content_bank/`.

```bat
python scripts/print_reel_prompt.py teaser
python scripts/print_reel_prompt.py ppv
```
