#!/usr/bin/env bash
set -e

export PORT="${1:-5173}"
url="http://127.0.0.1:$PORT"

echo "Starting local server on $url"
xdg-open "$url" >/dev/null 2>&1 &
exec bun run start
