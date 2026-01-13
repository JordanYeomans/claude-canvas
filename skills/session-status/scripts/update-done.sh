#!/bin/bash
# Update done items list
# Usage: update-done.sh <session-id> '[{"text":"item1"},{"text":"item2","done":false}]'

set -e

ID="$1"
shift
STATE_DIR="/tmp/session-status-${ID}"

if [ ! -d "$STATE_DIR" ]; then
    echo "Error: State directory not found: $STATE_DIR" >&2
    exit 1
fi

echo "$*" > "$STATE_DIR/done.json"

# Auto-refresh panels
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
"$SCRIPT_DIR/refresh.py" "$ID"
