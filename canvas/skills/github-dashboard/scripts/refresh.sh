#!/bin/bash
# GitHub PR Dashboard - Refresh Script
#
# Refreshes the GitHub PR dashboard panels with latest data.
# Fetches PR data via Python script, updates canvas panels via IPC.
#
# Usage:
#   ./refresh.sh [base_path] [canvas_dir]
#
# Arguments:
#   base_path  - Directory to scan for git repos (default: current directory)
#   canvas_dir - Path to canvas installation (default: auto-detect from script location)

set -e

# Get script directory to find canvas installation
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SKILL_DIR="$(dirname "$SCRIPT_DIR")"

# Default paths
BASE_PATH="${1:-.}"
CANVAS_DIR="${2:-$(dirname "$(dirname "$SKILL_DIR")")}"
DATA_FILE="/tmp/github-dashboard-data.json"

# Resolve to absolute path
BASE_PATH="$(cd "$BASE_PATH" && pwd)"

echo "Fetching PR data from: $BASE_PATH"
echo "Using canvas at: $CANVAS_DIR"

# Fetch PR data
python3 "$SCRIPT_DIR/fetch_prs.py" "$BASE_PATH" > "$DATA_FILE"

# Extract configs for each panel
TOP_CONFIG=$(python3 -c "import json; data=json.load(open('$DATA_FILE')); print(json.dumps(data['top']))")
BOTTOM_CONFIG=$(python3 -c "import json; data=json.load(open('$DATA_FILE')); print(json.dumps(data['bottom']))")

echo "Updating panels..."

# Update panels
cd "$CANVAS_DIR"
bun run src/cli.ts update github-dashboard-top --config "$TOP_CONFIG"
bun run src/cli.ts update github-dashboard-bottom --config "$BOTTOM_CONFIG"

echo "Done! Dashboard updated."
