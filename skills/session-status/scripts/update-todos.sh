#!/bin/bash
# Update todos list
# Usage: update-todos.sh <session-id> '[{"text":"task1","status":"done"},{"text":"task2","status":"in_progress"},{"text":"task3","status":"pending"}]'

set -e

ID="$1"
shift
STATE_DIR="/tmp/session-status-${ID}"

if [ ! -d "$STATE_DIR" ]; then
    echo "Error: State directory not found: $STATE_DIR" >&2
    exit 1
fi

echo "$*" > "$STATE_DIR/todos.json"

# Auto-refresh panels
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
"$SCRIPT_DIR/refresh.py" "$ID"
