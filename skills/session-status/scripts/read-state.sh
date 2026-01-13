#!/bin/bash
# Read all current state for a session
# Usage: read-state.sh <session-id>

ID="$1"
STATE_DIR="/tmp/session-status-${ID}"

if [ ! -d "$STATE_DIR" ]; then
    echo "Error: State directory not found: $STATE_DIR" >&2
    exit 1
fi

echo "=== Session: $ID ==="
echo ""
echo "=== Summary ==="
cat "$STATE_DIR/summary.txt" 2>/dev/null || echo "(empty)"
echo ""
echo "=== Goal ==="
cat "$STATE_DIR/goal.txt" 2>/dev/null || echo "(empty)"
echo ""
echo "=== Done ==="
cat "$STATE_DIR/done.json" 2>/dev/null || echo "[]"
echo ""
echo "=== Issues ==="
cat "$STATE_DIR/issues.json" 2>/dev/null || echo "[]"
echo ""
echo "=== Todos ==="
cat "$STATE_DIR/todos.json" 2>/dev/null || echo "[]"
echo ""
echo "=== Status ==="
cat "$STATE_DIR/status.json" 2>/dev/null || echo '{"status": "unknown"}'
echo ""
echo "=== Working Dir ==="
cat "$STATE_DIR/working_dir" 2>/dev/null || echo "(unknown)"
echo ""
echo "=== Start Time ==="
cat "$STATE_DIR/start_time" 2>/dev/null || echo "0"
