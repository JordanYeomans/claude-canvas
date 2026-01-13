#!/bin/bash
# Cleanup script for Claude Canvas panes
# Called by Claude Code's SessionEnd hook to close triple-vertical canvas panes

# 1. Try to get ID from environment variable (most robust in hook context)
MAIN_PANE_ID="$TMUX_PANE"

# 2. Fallback to display-message if env var is missing
if [ -z "$MAIN_PANE_ID" ]; then
    MAIN_PANE_ID=$(tmux display-message -p "#{pane_id}" 2>/dev/null)
fi

# 3. Validate we have an ID
if [ -z "$MAIN_PANE_ID" ]; then
    echo "Error: Could not determine current tmux pane ID" >&2
    exit 1
fi

TOP_PANE_FILE="/tmp/claude-canvas-${MAIN_PANE_ID}-top.pane"
BOTTOM_PANE_FILE="/tmp/claude-canvas-${MAIN_PANE_ID}-bottom.pane"

# Helper function to kill and clean
cleanup_pane() {
    local file=$1
    if [ -f "$file" ]; then
        local pane_id=$(cat "$file")
        # Check if pane exists before trying to kill to avoid error messages
        tmux kill-pane -t "$pane_id" 2>/dev/null || true
        rm -f "$file"
    fi
}

cleanup_pane "$TOP_PANE_FILE"
cleanup_pane "$BOTTOM_PANE_FILE"
