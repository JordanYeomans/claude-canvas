---
name: status-init
description: |
  Initialize session status display for a new Claude Code session.
  Use at the start of complex tasks. Spawns triple-vertical panels.
  Triggers: "init session", "start session status", "ss init"
---

# Session Status - Initialize

Run this at the start of a new session to spawn the status panels.

## Setup

```bash
ss daemon start    # Start auto-refresh (if not already running)
ss init            # Spawn panels, returns SESSION_ID
```

## Set Initial State

After init, set the context:

```bash
ss summary "<1-2 sentences describing what you're working on>"
ss goal "<the specific objective>"
ss status working "<current action>"
ss todos '[{"text":"<task>","status":"pending|in_progress|done"}]'
```

## Commands Reference

| Command | Purpose |
|---------|---------|
| `ss summary <text>` | Executive summary (what & why) |
| `ss goal <text>` | Specific objective |
| `ss todos <json>` | Task list with status |
| `ss done <json>` | Completed items log |
| `ss issues <json>` | Problems encountered |
| `ss status <state> [msg]` | Status bar: working/waiting/error/complete |

## Data Formats

**Todos**: `[{"text":"Task","status":"pending"}]`
- `done` = completed (hidden from list)
- `in_progress` = active (yellow →)
- `pending` = not started (gray •)

**Done**: `[{"text":"Completed task","done":true}]`
- `done:false` = in progress (→)

**Issues**: `[{"text":"Problem","fixed":true,"solution":"How fixed"}]`

## Panel Controls

| Cmd | Action |
|-----|--------|
| `ch` | Hide panels |
| `cs` | Show panels |
| `ct/cb/cm` | Focus top/bottom/middle |

## Best Practices

1. Keep summary brief (1-2 sentences)
2. Update todos as you progress
3. Log issues when you hit problems
4. Set status to `waiting` when you need user input
5. Git changes update automatically via daemon
