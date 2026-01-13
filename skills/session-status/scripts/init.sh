#!/bin/bash
# Initialize a new session status session
# Generates random 6-char ID, creates state directory, spawns triple-vertical layout

set -e

# Generate random 6-char alphanumeric ID
ID=$(cat /dev/urandom | LC_ALL=C tr -dc 'a-z0-9' | head -c 6)
STATE_DIR="/tmp/session-status-${ID}"

# Create state directory
mkdir -p "$STATE_DIR"

# Save start time (epoch ms)
echo $(($(date +%s) * 1000)) > "$STATE_DIR/start_time"

# Save session ID
echo "$ID" > "$STATE_DIR/session_id"

# Save working directory
pwd > "$STATE_DIR/working_dir"

# Initialize empty state files
echo "" > "$STATE_DIR/summary.txt"
echo "" > "$STATE_DIR/goal.txt"
echo "[]" > "$STATE_DIR/done.json"
echo "[]" > "$STATE_DIR/issues.json"
echo "[]" > "$STATE_DIR/todos.json"
echo '{"status": "working", "message": "Initializing..."}' > "$STATE_DIR/status.json"

# Spawn triple-vertical layout
cd /Users/jordanyeomans/Documents/repos_jy/claude-canvas/canvas
bun run src/cli.ts spawn workspace --layout triple-vertical --id "$ID"

echo ""
echo "SESSION_ID=$ID"
echo "STATE_DIR=$STATE_DIR"
echo ""
echo "Use this ID for all subsequent commands."
