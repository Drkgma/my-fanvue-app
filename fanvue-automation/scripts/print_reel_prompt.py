"""Print a paste-ready VEO 3 JSON reel prompt."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from reel_prompts import (  # noqa: E402
    KNOWN_REELS,
    ReelPromptError,
    load_reel,
    paste_text,
    public_teaser_is_safe,
    validate_reel,
)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "reel",
        nargs="?",
        default="teaser",
        choices=KNOWN_REELS,
        help="Which obsessed-outcome JSON to print",
    )
    args = parser.parse_args()
    try:
        data = load_reel(args.reel)
    except ReelPromptError as exc:
        print(str(exc), file=sys.stderr)
        return 2
    errors = validate_reel(data)
    if args.reel == "teaser" and not public_teaser_is_safe(data):
        errors.append("teaser prompt is not follower-safe")
    if errors:
        print("invalid reel prompt:", file=sys.stderr)
        for item in errors:
            print(f"- {item}", file=sys.stderr)
        return 1
    sys.stdout.write(paste_text(data))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
