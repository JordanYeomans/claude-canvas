#!/bin/bash
# Update session goal text
# Usage: update-goal.sh <session-id> "goal text"

set -e

ID="$1"
shift
STATE_DIR="/tmp/session-status-${ID}"

if [ ! -d "$STATE_DIR" ]; then
    echo "Error: State directory not found: $STATE_DIR" >&2
    exit 1
fi

echo "$*" > "$STATE_DIR/goal.txt"

# Auto-refresh panels
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
"$SCRIPT_DIR/refresh.py" "$ID"
