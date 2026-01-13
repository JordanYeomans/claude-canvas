# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Run CLI
bun run src/cli.ts

# Show canvas in current terminal
bun run src/cli.ts show calendar
bun run src/cli.ts show document --scenario edit --config '{"content": "# Hello"}'

# Spawn canvas in tmux split pane (requires tmux session)
bun run src/cli.ts spawn calendar --scenario meeting-picker --config '{"calendars": [...]}'
bun run src/cli.ts spawn workspace --layout triple-vertical --id myworkspace

# Update running canvas via IPC
bun run src/cli.ts update <canvas-id> --config '{"title": "New Title"}'

# Get document selection/content
bun run src/cli.ts selection <canvas-id>
bun run src/cli.ts content <canvas-id>

# Check terminal environment
bun run src/cli.ts env

# Run tests
bun test

# Install dependencies
bun install
```

## Architecture

Canvas is a Claude Code plugin that provides interactive terminal TUI components (calendars, documents, flight booking) spawned in tmux split panes with real-time IPC communication.

### Core Flow

1. **CLI** (`src/cli.ts`) - Entry point using Commander.js. Commands: `show`, `spawn`, `update`, `selection`, `content`, `env`
2. **Terminal spawning** (`src/terminal.ts`) - Detects tmux, spawns panes, manages pane reuse. Tracks pane IDs in `/tmp/claude-canvas-*.sock`
3. **Canvas rendering** (`src/canvases/index.tsx`) - Routes to canvas components (Calendar, Document, Flight, Panel) using Ink (React for CLI)
4. **IPC communication** - Unix domain sockets at `/tmp/canvas-{id}.sock` for bidirectional messaging between Claude and canvases

### Canvas Types

| Canvas | Component | Scenarios |
|--------|-----------|-----------|
| `calendar` | `src/canvases/calendar.tsx` | `display`, `meeting-picker` |
| `document` | `src/canvases/document.tsx` | `display`, `edit`, `email-preview` |
| `flight` | `src/canvases/flight.tsx` | `booking` |
| `panel` | `src/canvases/panel.tsx` | Simple text panel for triple-vertical layout |
| `triple-vertical` | `src/canvases/triple-vertical.tsx` | Three-pane vertical layout |

### Scenario System

Scenarios define interaction modes for each canvas type. Defined in `src/scenarios/` and registered in `src/scenarios/registry.ts`.

```typescript
interface ScenarioDefinition {
  name: string;
  canvasKind: string;
  interactionMode: "view-only" | "selection" | "multi-select";
  closeOn: "selection" | "escape" | "command" | "never";
  defaultConfig: Partial<Config>;
}
```

### IPC Protocol

Messages are newline-delimited JSON over Unix sockets.

**Canvas → Controller:**
- `{ type: "ready", scenario }` - Canvas initialized
- `{ type: "selected", data }` - User made selection
- `{ type: "cancelled", reason? }` - User cancelled
- `{ type: "error", message }` - Error occurred

**Controller → Canvas:**
- `{ type: "update", config }` - Update canvas config
- `{ type: "close" }` - Request canvas close
- `{ type: "getSelection" }` / `{ type: "getContent" }` - Request current state

### Adding a New Canvas Type

1. Create component in `src/canvases/[name].tsx` - React/Ink component with `useIPCServer` hook
2. Add type definitions in `src/canvases/[name]/types.ts`
3. Create scenario definitions in `src/scenarios/[name]/`
4. Register scenarios in `src/scenarios/registry.ts`
5. Add render function in `src/canvases/index.tsx`
6. Add skill documentation in `skills/[name]/SKILL.md`

### Key Patterns

- **IPC hooks**: Canvas components use `useIPCServer` hook (`src/canvases/calendar/hooks/use-ipc-server.ts`) for socket communication
- **Config via temp files**: Long JSON configs are written to `/tmp/canvas-config-{id}.json` to avoid shell escaping issues
- **Pane reuse**: Subsequent spawns reuse existing tmux pane if available (`CANVAS_PANE_FILE`)
- **Triple-vertical layout**: Uses `--layout triple-vertical` flag, creates `{id}-top` and `{id}-bottom` panel IDs

### High-Level API

For programmatic use in TypeScript:

```typescript
import { pickMeetingTime, editDocument } from "./src/api";

const result = await pickMeetingTime({
  calendars: [...],
  slotGranularity: 30,
});
```
