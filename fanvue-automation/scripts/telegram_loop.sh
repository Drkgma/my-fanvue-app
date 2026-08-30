#!/usr/bin/env bash
# Owner Telegram chat: /status /share /kit, or any text → trial link.
# Does not post to Reddit/X. Fanvue posting stays in operate_loop.sh.
set -euo pipefail
cd "$(dirname "$0")/.."
while true; do
  python3 -c "from telegram_operator import poll_forever; poll_forever()" || true
  echo "telegram operator exited; restart in 3s"
  sleep 3
done
