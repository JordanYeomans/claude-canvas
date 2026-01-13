#!/bin/bash

# Test script for session status design
# Run: c3 session-test && ./canvas/scripts/test-session-status.sh

CANVAS_DIR="/Users/jordanyeomans/Documents/repos_jy/claude-canvas/canvas"
ID="${1:-session-test}"

# Top Panel: Session Summary (structured data)
TOP_CONFIG=$(cat <<'EOF'
{
  "noBorder": true,
  "sessionSummary": {
    "type": "session-summary",
    "summary": "We are building a session status skill that displays progress in the triple-vertical layout. Currently testing the UI design with mock data before implementing the skill. The panel includes sections for executive summary, goal, working directory, completed tasks, issues encountered, and git changes. We have added support for auto-calculated progress bars, elapsed time tracking, and animated status indicators. The design uses a purple color scheme for headers, green for additions, red for deletions, and orange for the working status bar.",
    "goal": "Build session status skill for triple-vertical layout",
    "workingDir": "/Users/jordanyeomans/Documents/repos_jy/claude-canvas",
    "done": [
      {"text": "Explored c3 command"},
      {"text": "Found meq-github skill"},
      {"text": "Reviewed design capabilities"},
      {"text": "Chose color semantics"},
      {"text": "Designed UI layout"},
      {"text": "Added noBorder to panel.tsx"},
      {"text": "Created test script"},
      {"text": "Added section-based layout"},
      {"text": "Added structured data types"},
      {"text": "Testing the layout", "done": false}
    ],
    "issues": [
      {"text": "Socket timeout", "fixed": true, "solution": "retry logic"},
      {"text": "Type mismatch", "fixed": false, "solution": "investigating"}
    ],
    "branch": "feat/session-status-skill",
    "changes": [
      {"file": "src/canvases/panel.tsx", "status": "M", "additions": 85, "deletions": 12},
      {"file": "src/terminal.ts", "status": "M", "additions": 8, "deletions": 2},
      {"file": "scripts/test-session-status.sh", "status": "M", "additions": 25, "deletions": 10},
      {"file": "src/new-feature.ts", "status": "A", "additions": 45, "deletions": 0},
      {"file": "tmp/debug.log", "status": "?"}
    ]
  }
}
EOF
)

# Bottom Panel: Session Todo (structured data)
# startTime is epoch ms - timer auto-updates every second
START_TIME=$(($(date +%s) * 1000))

BOTTOM_CONFIG=$(cat <<EOF
{
  "noBorder": true,
  "sessionTodo": {
    "type": "session-todo",
    "status": "working",
    "statusMessage": "Updating panel component...",
    "startTime": ${START_TIME},
    "todos": [
      {"text": "Explored c3 command", "status": "done"},
      {"text": "Found meq-github skill", "status": "done"},
      {"text": "Designed UI layout", "status": "done"},
      {"text": "Added structured data types", "status": "done"},
      {"text": "Create mock config", "status": "in_progress"},
      {"text": "Test rendering", "status": "pending"},
      {"text": "Finalize panel component", "status": "pending"},
      {"text": "Implement IPC updates", "status": "pending"},
      {"text": "Write skill scaffold", "status": "pending"},
      {"text": "Documentation", "status": "pending"}
    ]
  }
}
EOF
)

echo "Updating ${ID}-top..."
cd "$CANVAS_DIR"
bun run src/cli.ts update "${ID}-top" --config "$TOP_CONFIG"

echo "Updating ${ID}-bottom..."
bun run src/cli.ts update "${ID}-bottom" --config "$BOTTOM_CONFIG"

echo "Done! Check your tmux panes."
