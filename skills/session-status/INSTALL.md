# Session Status - Installation Guide

## Prerequisites

- **tmux**: For panel spawning
- **Bun**: For canvas CLI
- **Python 3.8+**: For refresh script
- **Git**: For change detection

## Installation Steps

### 1. Clone the Repository

```bash
git clone https://github.com/YOUR_USERNAME/claude-canvas.git
cd claude-canvas
```

### 2. Install Dependencies

```bash
cd canvas
bun install
```

### 3. Symlink Canvas Scripts to PATH

```bash
# Ensure ~/.local/bin exists
mkdir -p ~/.local/bin

# Symlink canvas commands
ln -sf "$(pwd)/canvas/scripts/c3" ~/.local/bin/c3
ln -sf "$(pwd)/canvas/scripts/ss" ~/.local/bin/ss
ln -sf "$(pwd)/canvas/scripts/ss-daemon" ~/.local/bin/ss-daemon
ln -sf "$(pwd)/canvas/scripts/ch" ~/.local/bin/ch
ln -sf "$(pwd)/canvas/scripts/cs" ~/.local/bin/cs
ln -sf "$(pwd)/canvas/scripts/ct" ~/.local/bin/ct
ln -sf "$(pwd)/canvas/scripts/cb" ~/.local/bin/cb
ln -sf "$(pwd)/canvas/scripts/cm" ~/.local/bin/cm

# Verify ~/.local/bin is in your PATH
echo $PATH | grep -q "$HOME/.local/bin" || echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.zshrc
```

### 4. Symlink Skills to Claude Code

```bash
# Create Claude skills directory if it doesn't exist
mkdir -p ~/.claude/skills

# Symlink all three skills
ln -sf "$(pwd)/skills/session-status" ~/.claude/skills/session-status
ln -sf "$(pwd)/skills/status-init" ~/.claude/skills/status-init
ln -sf "$(pwd)/skills/status-update" ~/.claude/skills/status-update
```

**Skills installed:**
- `session-status` - Full reference documentation
- `status-init` - Use when starting a new session
- `status-update` - Brief reminder for frequent updates

### 5. Verify Installation

```bash
# Check commands are available
which ss
which c3
which ch

# Test the skill
ss init           # Should spawn triple-vertical layout
ss daemon start   # Start auto-refresh
ss summary "Testing installation"
ss goal "Verify everything works"
ss status working "Running tests..."
```

You should see:
- Three panels: top (summary), middle (Claude), bottom (todos)
- Changes section showing modified files
- Progress bar and elapsed time

## Updating

Pull latest changes and scripts are automatically updated (symlinked):

```bash
cd /path/to/claude-canvas
git pull
cd canvas && bun install
```

## Uninstall

```bash
# Stop daemon
ss daemon stop

# Remove symlinks
rm ~/.local/bin/ss ~/.local/bin/ss-daemon ~/.local/bin/c3
rm ~/.local/bin/ch ~/.local/bin/cs ~/.local/bin/ct ~/.local/bin/cb ~/.local/bin/cm
rm ~/.claude/skills/session-status ~/.claude/skills/status-init ~/.claude/skills/status-update

# Clean up runtime files
rm -rf /tmp/session-status-*
rm -rf /tmp/ss-sessions
rm /tmp/ss-daemon.pid
```

## Troubleshooting

### "Not in a tmux session"
Run inside tmux:
```bash
tmux
ss init
```

### "Daemon already running"
Check status:
```bash
ss daemon status
```

### Panels not showing
Verify you're in tmux and canvas CLI works:
```bash
cd /path/to/claude-canvas/canvas
bun run src/cli.ts env
```

### Git changes not updating
Check daemon is running:
```bash
ss daemon status
ss daemon start    # Start if not running
```

Check daemon log:
```bash
tail -f /tmp/ss-daemon.log
```
