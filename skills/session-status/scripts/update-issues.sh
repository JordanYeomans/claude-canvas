#!/bin/bash
# Update issues list
# Usage: update-issues.sh <session-id> '[{"text":"issue1","fixed":true,"solution":"fix"},{"text":"issue2","fixed":false}]'

set -e

ID="$1"
shift
STATE_DIR="/tmp/session-status-${ID}"

if [ ! -d "$STATE_DIR" ]; then
    echo "Error: State directory not found: $STATE_DIR" >&2
    exit 1
fi

echo "$*" > "$STATE_DIR/issues.json"

# Auto-refresh panels
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
"$SCRIPT_DIR/refresh.py" "$ID"
