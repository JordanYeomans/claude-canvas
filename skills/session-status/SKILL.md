---
name: session-status
description: |
  Display session progress in a triple-vertical canvas layout with summary, todos, and git changes.
  Use at the start of complex tasks to provide visual progress tracking.
  Triggers: "start session status", "show session status", "init session", "ss init"
---

# Session Status Skill

Display session progress in a triple-vertical canvas layout with:
- **Top panel**: Executive summary, goal, completed items, issues, git changes
- **Bottom panel**: Status indicator, progress bar, todo list

## Quick Start

```bash
ss daemon start  # Start auto-refresh (if not already running)
ss init          # Initialize session (spawns panels, returns SESSION_ID)

# Set initial state (chain commands for efficiency)
ss summary "Working on..." && \
ss goal "Build feature X" && \
ss status working "Reading..." && \
ss todos '[{"text":"Task","status":"in_progress"}]'
```

## CLI Reference

### Session Commands

| Command | Description | Example |
|---------|-------------|---------|
| `ss init` | Initialize new session | `ss init` |
| `ss summary <text>` | Set executive summary | `ss summary "Building auth feature"` |
| `ss goal <text>` | Set goal | `ss goal "Add OAuth2 login"` |
| `ss done <json>` | Set done items | `ss done '[{"text":"Task 1"}]'` |
| `ss issues <json>` | Set issues | `ss issues '[{"text":"Bug","fixed":true}]'` |
| `ss todos <json>` | Set todos | `ss todos '[{"text":"Task","status":"pending"}]'` |
| `ss status <state> [msg]` | Set status | `ss status working "Reading files..."` |
| `ss refresh` | Force refresh panels | `ss refresh` |
| `ss show` | Show current state | `ss show` |
| `ss id` | Show session ID | `ss id` |

### Daemon Commands (Auto-refresh)

| Command | Description |
|---------|-------------|
| `ss daemon start [interval]` | Start background refresh (default: 5s) |
| `ss daemon stop` | Stop background refresh |
| `ss daemon status` | Check if daemon is running |

### Panel Control Commands

| Command | Description |
|---------|-------------|
| `ch` | **H**ide panels (tmux zoom) |
| `cs` | **S**how panels (unzoom) |
| `ct` | Focus **t**op panel |
| `cb` | Focus **b**ottom panel |
| `cm` | Focus **m**iddle panel (Claude) |

## Data Formats

### Done Item
```json
{"text": "Completed task description", "done": true}
```
- `done: true` (default) = completed (✓)
- `done: false` = in progress (→)

### Issue
```json
{"text": "Issue description", "fixed": true, "solution": "How it was fixed"}
```
- `fixed: true` = resolved (✓ green)
- `fixed: false` = unresolved (✗ red)

### Todo Item
```json
{"text": "Task description", "status": "pending"}
```
- `status: "done"` = completed (✓ green, hidden from list)
- `status: "in_progress"` = active (→ yellow)
- `status: "pending"` = not started (• gray)

### Status Values
- `working` - Agent is actively working (white spinner, no background)
- `waiting` - Waiting for user input (orange bar)
- `error` - Error occurred (red bar)
- `complete` - Task complete (green bar)

## Features

### Automatic Data
The following data is gathered automatically:
- **Working directory**: Set at init, displayed in top panel
- **Git branch**: `git branch --show-current`
- **Git changes**: Files sorted in filesystem order with +/- stats
- **Elapsed time**: Calculated from session start time
- **Progress bar**: Calculated from todos (done/total)

### Multi-Instance Support
Each tmux pane maps to its own session ID. Run multiple Claude instances simultaneously without conflicts.

### Auto-Cleanup
The daemon automatically cleans up sessions when their pane closes.

## Typical Workflow

```bash
# 1. Start daemon (once, persists across sessions)
ss daemon start

# 2. Initialize session
ss init

# 3. Set initial state (chain commands)
ss summary "Implementing user authentication with OAuth2" && \
ss goal "Add Google and GitHub login providers" && \
ss todos '[{"text":"Setup OAuth provider","status":"in_progress"},{"text":"Create endpoints","status":"pending"}]'

# 4. Update as you work (chain commands)
ss status working "Configuring OAuth..." && \
ss done '[{"text":"Researched OAuth flow"}]' && \
ss todos '[{"text":"Setup OAuth provider","status":"done"},{"text":"Create endpoints","status":"in_progress"}]'

# 5. Log issues (can be standalone)
ss issues '[{"text":"CORS error","fixed":true,"solution":"Added origin to whitelist"}]'

# 6. Mark complete
ss status complete "Authentication implemented!"
```

## File Locations

- **CLI**: `~/.local/bin/ss`
- **Skill**: `~/.claude/skills/session-status/`
- **Runtime state**: `/tmp/session-status-{id}/`
- **Session mappings**: `/tmp/ss-sessions/`
- **Daemon PID**: `/tmp/ss-daemon.pid`
- **Daemon log**: `/tmp/ss-daemon.log`

## Requirements

- tmux (for panel spawning)
- Bun (for canvas CLI)
- Python 3.8+ (for refresh.py)
- Git (for change detection)
