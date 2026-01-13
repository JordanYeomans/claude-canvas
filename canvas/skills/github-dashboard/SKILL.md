---
name: github-dashboard
description: |
  Display GitHub PRs in a triple-vertical canvas layout with colored status indicators.
  Use when user asks to see their PRs, check PR status, view GitHub dashboard, or review their GitHub work.
  Triggers: "show my PRs", "github dashboard", "github-dashboard", "PR status", "what PRs need attention"
---

# GitHub PR Dashboard

Display your GitHub PRs and review requests in a triple-vertical canvas layout with colored status indicators.

## Overview

This skill creates a dashboard showing:
- **Top Panel**: Your open pull requests with colored status indicators
- **Middle**: Claude Code session (unchanged)
- **Bottom Panel**: PRs where you've been requested as a reviewer

## Status Indicators

| Color | Status | Condition |
|-------|--------|-----------|
| Green | Ready to merge | `mergeable=MERGEABLE` AND (`reviewDecision=APPROVED` OR no reviews required) |
| Purple (magenta) | Awaiting feedback | Last comment/review NOT from you, OR unresolved review threads |
| Red | Problem | `mergeable=CONFLICTING` OR `reviewDecision=CHANGES_REQUESTED` |

## Layout

```
+----------------------------------+
|      TOP: My Pull Requests       |  25%
|  #123 [repo-name] Fix auth bug   |  <- colored by status
|  #45 [other-repo] Add feature    |
+----------------------------------+
|      MIDDLE: Claude Code         |  50%
|      (Your active session)       |
+----------------------------------+
|    BOTTOM: Review Requests       |  25%
|  #78 [repo-name] New feature     |
+----------------------------------+
```

## Usage

### 1. Spawn the Layout

```bash
cd /path/to/claude-canvas/canvas
bun run src/cli.ts spawn workspace --layout triple-vertical --id github-dashboard
```

### 2. Refresh with PR Data

```bash
# From your repos directory
source .envrc  # If using direnv for GH_TOKEN
~/.claude/skills/github-dashboard/scripts/refresh.sh /path/to/your/repos
```

Or use `.` to scan the current directory:

```bash
cd /path/to/your/repos
source .envrc
~/.claude/skills/github-dashboard/scripts/refresh.sh .
```

## Repo Discovery

The script automatically discovers Git repositories:
- Scans the specified base path for `.git` directories
- Supports nested repos (monorepo setups with multiple child repos)
- Parses `git remote get-url origin` to identify GitHub repos
- Queries each discovered repo for PRs via the `gh` CLI

## Requirements

- `gh` CLI installed and authenticated (`brew install gh && gh auth login`)
- `GH_TOKEN` environment variable set
- tmux session (for canvas panes)
- Python 3.8+
- Bun runtime

## Installation

1. Create the skill directory:
   ```bash
   mkdir -p ~/.claude/skills/github-dashboard/scripts
   ```

2. Copy the scripts from this repo or create them:
   - `~/.claude/skills/github-dashboard/SKILL.md` - Skill definition
   - `~/.claude/skills/github-dashboard/scripts/fetch_prs.py` - PR fetching script
   - `~/.claude/skills/github-dashboard/scripts/refresh.sh` - Refresh wrapper

3. Make scripts executable:
   ```bash
   chmod +x ~/.claude/skills/github-dashboard/scripts/*.sh
   chmod +x ~/.claude/skills/github-dashboard/scripts/*.py
   ```

## Panel Configuration

The skill uses the extended `PanelConfig` interface with per-line colors:

```typescript
interface StyledLine {
  text: string;
  color?: "green" | "magenta" | "red" | "white" | "cyan" | "yellow" | "gray";
}

interface PanelConfig {
  title?: string;
  content?: string;
  lines?: StyledLine[];  // Array of styled lines (takes precedence over content)
  borderColor?: string;
  titleColor?: string;
}
```

## Troubleshooting

### "gh: command not found"
Install GitHub CLI: `brew install gh`

### "not logged into any GitHub hosts"
Authenticate: `gh auth login`

### Panels not updating
Check the socket paths exist:
```bash
ls /tmp/canvas-github-dashboard-*.sock
```

### No PRs showing
Verify the base path contains Git repos:
```bash
find /path/to/repos -name ".git" -type d
```
