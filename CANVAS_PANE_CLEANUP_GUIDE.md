# Canvas Pane Auto-Cleanup Setup

When using the triple-vertical layout, canvas panes (top and bottom) will automatically close when Claude Code exits.

## Quick Setup

Add the SessionEnd hook to `~/.claude/settings.json`:

```json
{
  "hooks": {
    "SessionEnd": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "/path/to/claude-canvas/canvas/scripts/cleanup-canvas-panes.sh"
          }
        ]
      }
    ]
  }
}
```

Replace `/path/to/claude-canvas` with your actual path.

**Note:** If you already have a `settings.json`, merge the `hooks` section into your existing config.

## How It Works

The cleanup uses a **hybrid approach** for maximum reliability:

| Exit Type | Mechanism | Cleanup Speed |
|-----------|-----------|---------------|
| Graceful (`/exit`, Ctrl+D) | SessionEnd hook | Instant |
| Crash / SIGKILL | Polling fallback | ~2 seconds |

- **SessionEnd hook**: Fires when Claude Code exits normally, instantly closing panes
- **Polling fallback**: Each panel checks every 2 seconds if the main pane still exists (handles crashes)

## Multi-Session Support

Each Claude Code session tracks its own panes using session-specific files:
- `/tmp/claude-canvas-{pane_id}-top.pane`
- `/tmp/claude-canvas-{pane_id}-bottom.pane`

This means multiple Claude Code sessions can run simultaneously without interfering with each other's canvas panes.

## Testing

1. Start Claude Code in tmux
2. Spawn triple-vertical layout:
   ```bash
   c3
   ```
3. Exit Claude Code (`/exit` or Ctrl+D)
4. Verify both canvas panes close automatically

## Troubleshooting

**Panes don't close on exit:**
- Ensure the hook is in `~/.claude/settings.json` (not project settings)
- Restart Claude Code after adding the hook
- Check the script is executable: `chmod +x canvas/scripts/cleanup-canvas-panes.sh`

**Panes don't close after crash:**
- The polling fallback takes up to 2 seconds
- Verify the panel is receiving `watchPaneId` in its config
