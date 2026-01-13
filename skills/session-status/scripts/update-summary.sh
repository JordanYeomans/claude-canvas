#!/bin/bash
# Update session summary text
# Usage: update-summary.sh <session-id> "summary text"

set -e

ID="$1"
shift
STATE_DIR="/tmp/session-status-${ID}"

if [ ! -d "$STATE_DIR" ]; then
    echo "Error: State directory not found: $STATE_DIR" >&2
    exit 1
fi

echo "$*" > "$STATE_DIR/summary.txt"

# Auto-refresh panels
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
"$SCRIPT_DIR/refresh.py" "$ID"
