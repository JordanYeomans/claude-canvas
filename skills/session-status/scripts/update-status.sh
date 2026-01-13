#!/bin/bash
# Update agent status
# Usage: update-status.sh <session-id> <status> [message]
# Status can be: working, waiting, error, complete

set -e

ID="$1"
STATUS="$2"
shift 2
MESSAGE="$*"
STATE_DIR="/tmp/session-status-${ID}"

if [ ! -d "$STATE_DIR" ]; then
    echo "Error: State directory not found: $STATE_DIR" >&2
    exit 1
fi

# Validate status
case "$STATUS" in
    working|waiting|error|complete)
        ;;
    *)
        echo "Error: Invalid status '$STATUS'. Must be: working, waiting, error, complete" >&2
        exit 1
        ;;
esac

# Write status JSON
cat > "$STATE_DIR/status.json" << EOF
{"status": "$STATUS", "message": "$MESSAGE"}
EOF

# Auto-refresh panels
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
"$SCRIPT_DIR/refresh.py" "$ID"
