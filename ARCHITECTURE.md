# Claude Canvas - System Architecture

## Executive Summary

Claude Canvas is a proof-of-concept plugin that enables Claude Code to spawn and control interactive terminal user interfaces (TUIs). It creates a split-pane experience where Claude runs in one pane and a visual canvas (calendar, document, flight booking) runs in another, with real-time bidirectional communication via Unix domain sockets.

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              tmux Session                                    │
├─────────────────────────────────┬───────────────────────────────────────────┤
│                                 │                                           │
│   Claude Code Pane (33%)        │   Canvas Pane (67%)                       │
│   ─────────────────────         │   ───────────────────                     │
│                                 │                                           │
│   ┌─────────────────────┐       │   ┌─────────────────────────────────┐     │
│   │  Claude Code CLI    │       │   │  Canvas React App (Ink)         │     │
│   │                     │       │   │                                 │     │
│   │  • Skills loaded    │◄──────┼──►│  • Calendar view                │     │
│   │  • Executes bash    │  IPC  │   │  • Document editor              │     │
│   │  • Spawns canvases  │ Unix  │   │  • Flight booking               │     │
│   │                     │Socket │   │                                 │     │
│   └─────────────────────┘       │   └─────────────────────────────────┘     │
│                                 │                                           │
└─────────────────────────────────┴───────────────────────────────────────────┘
```

---

## Component Deep Dive

### 1. Entry Point: CLI (`src/cli.ts`)

The CLI is the gateway to all canvas operations. It provides these commands:

| Command | Purpose |
|---------|---------|
| `show [kind]` | Render canvas in the current terminal (blocking) |
| `spawn [kind]` | Create tmux split and render canvas there (non-blocking) |
| `env` | Display terminal environment info |
| `update <id>` | Send config update to running canvas via IPC |
| `selection <id>` | Query current text selection from document canvas |
| `content <id>` | Query current content from document canvas |

**Example flow:**
```bash
# Claude Code executes this via Bash tool:
bun run src/cli.ts spawn calendar --scenario meeting-picker --config '{"calendars": [...]}'

# CLI parses args → calls spawnCanvas() → returns immediately
# Canvas runs in background pane
```

### 2. Terminal Management (`src/terminal.ts`)

Handles tmux pane creation and reuse:

```
┌────────────────────────────────────────────────────────────────┐
│                        spawnCanvas()                            │
├────────────────────────────────────────────────────────────────┤
│                              │                                  │
│                              ▼                                  │
│                     detectTerminal()                            │
│                              │                                  │
│              ┌───────────────┴───────────────┐                  │
│              │                               │                  │
│        In tmux?                         Not in tmux             │
│              │                               │                  │
│              ▼                               ▼                  │
│     getCanvasPaneId()                  throw Error              │
│              │                                                  │
│     ┌────────┴────────┐                                         │
│     │                 │                                         │
│ Pane exists?     No pane                                        │
│     │                 │                                         │
│     ▼                 ▼                                         │
│ reuseExistingPane() createNewPane()                             │
│ (send-keys)     (split-window -d)                               │
│                                                                 │
└────────────────────────────────────────────────────────────────┘
```

**Key implementation details:**

- **Pane ID persistence**: Stored in `/tmp/claude-canvas-pane-id`
- **Pane reuse**: If canvas pane exists, sends `Ctrl+C` then new command
- **Focus preservation**: Uses `tmux split-window -d` to keep focus on Claude
- **Split ratio**: 67% width for canvas (Claude gets 33%)

### 3. IPC System (`src/ipc/`)

Unix domain sockets enable real-time communication between Claude and canvases.

#### Socket Path Convention
```typescript
function getSocketPath(id: string): string {
  return `/tmp/canvas-${id}.sock`;
}
// Example: /tmp/canvas-calendar-1.sock
```

#### Message Types

**Controller → Canvas (Claude sends):**
```typescript
type ControllerMessage =
  | { type: "close" }                    // Request canvas to exit
  | { type: "update"; config: unknown }  // Push new configuration
  | { type: "ping" }                     // Health check
  | { type: "getSelection" }             // Query text selection
  | { type: "getContent" };              // Query document content
```

**Canvas → Controller (Canvas responds):**
```typescript
type CanvasMessage =
  | { type: "ready"; scenario: string }           // Canvas initialized
  | { type: "selected"; data: unknown }           // User made selection
  | { type: "cancelled"; reason?: string }        // User cancelled
  | { type: "error"; message: string }            // Error occurred
  | { type: "pong" }                              // Health check response
  | { type: "selection"; data: SelectionData }    // Selection response
  | { type: "content"; data: ContentData };       // Content response
```

#### IPC Flow Diagram

```
Claude Code                     Unix Socket                    Canvas
    │                               │                             │
    │  spawn canvas with socket     │                             │
    │──────────────────────────────►│                             │
    │                               │      canvas starts          │
    │                               │◄────────────────────────────│
    │                               │                             │
    │                               │   { type: "ready" }         │
    │◄──────────────────────────────│◄────────────────────────────│
    │                               │                             │
    │  { type: "update", config }   │                             │
    │──────────────────────────────►│─────────────────────────────►│
    │                               │                             │
    │                               │   (user interacts)          │
    │                               │                             │
    │                               │   { type: "selected", data }│
    │◄──────────────────────────────│◄────────────────────────────│
    │                               │                             │
```

### 4. Canvas Registry (`src/canvases/index.tsx`)

Central dispatcher that routes canvas requests:

```typescript
export async function renderCanvas(
  kind: string,      // "calendar" | "document" | "flight"
  id: string,        // Unique instance ID
  config?: unknown,  // Canvas-specific configuration
  options?: RenderOptions
): Promise<void> {
  switch (kind) {
    case "calendar":
      return renderCalendar(id, config, options);
    case "document":
      return renderDocument(id, config, options);
    case "flight":
      return renderFlight(id, config, options);
  }
}
```

### 5. Canvas Components (`src/canvases/*.tsx`)

Built with [Ink](https://github.com/vadimdemedes/ink) - React for CLIs.

#### Calendar Canvas Structure
```
Calendar Component
├── DayHeadersRow         # Mon Tue Wed Thu Fri Sat Sun
├── AllDayEventsRow       # All-day events bar
├── Time Column           # 6am, 7am, 8am...
└── Day Columns (×7)      # Event slots for each day
    └── Time Slots        # 30-min increments with events
```

#### Document Canvas Features
- Markdown rendering
- Text selection with mouse
- Diff highlighting (additions/deletions)
- Email preview mode

#### Flight Canvas Features
- Flight comparison cards
- Seat map with selection
- Cyberpunk-styled UI

### 6. Scenario System (`src/scenarios/`)

Scenarios define interaction modes for each canvas type:

```typescript
interface ScenarioDefinition {
  name: string;              // "meeting-picker"
  description: string;       // Human-readable description
  canvasKind: string;        // "calendar"
  interactionMode: "view-only" | "selection" | "multi-select";
  closeOn: "selection" | "escape" | "command" | "never";
  autoCloseDelay?: number;   // ms after selection before close
  defaultConfig: object;     // Default configuration
}
```

**Registered Scenarios:**
| Canvas | Scenario | Mode | Description |
|--------|----------|------|-------------|
| calendar | display | view-only | Static calendar view |
| calendar | meeting-picker | selection | Click time slots to select |
| document | display | view-only | Read-only markdown render |
| document | edit | selection | Select text for editing |
| document | email-preview | view-only | Email-formatted preview |
| flight | booking | selection | Select flights and seats |

### 7. Skills & Commands Integration

Skills tell Claude Code how to use canvases:

```
.claude/
├── skills/
│   ├── canvas/SKILL.md     # Main canvas documentation
│   ├── calendar/SKILL.md   # Calendar-specific usage
│   ├── document/SKILL.md   # Document-specific usage
│   └── flight/SKILL.md     # Flight-specific usage
└── commands/
    └── canvas.md           # /canvas slash command
```

**Skill loading**: Claude Code reads `SKILL.md` files which contain markdown documentation about when and how to use each canvas type.

---

## Data Flow: Complete Example

Let's trace a meeting picker interaction:

```
1. User: "Find a time when Alice and Bob are free tomorrow"

2. Claude Code (reads skill documentation, decides to spawn calendar)
   │
   └─► Executes bash command:
       bun run src/cli.ts spawn calendar \
         --scenario meeting-picker \
         --config '{"calendars": [
           {"name": "Alice", "events": [...]},
           {"name": "Bob", "events": [...]}
         ]}'

3. CLI (cli.ts)
   │
   └─► Calls spawnCanvas("calendar", "calendar-1", configJson, options)

4. Terminal Manager (terminal.ts)
   │
   ├─► Checks: Am I in tmux? Yes
   ├─► Checks: Does canvas pane exist? No
   └─► Creates new pane:
       tmux split-window -h -d -p 67 -P -F "#{pane_id}" \
         "./run-canvas.sh show calendar --config '...' --socket /tmp/canvas-calendar-1.sock"

5. Canvas Process (in new pane)
   │
   ├─► Starts IPC server on /tmp/canvas-calendar-1.sock
   ├─► Renders MeetingPickerView with Ink
   └─► Sends: { type: "ready", scenario: "meeting-picker" }

6. User clicks a time slot in the canvas
   │
   └─► Canvas sends: { type: "selected", data: { startTime: "...", duration: 30 } }

7. Claude Code receives selection via IPC
   │
   └─► Responds to user: "I've scheduled the meeting for 2pm tomorrow"
```

---

## File Structure Reference

```
claude-canvas/
├── .claude-plugin/
│   └── marketplace.json      # Plugin metadata for Claude marketplace
│
├── canvas/                   # Main plugin code
│   ├── .claude/              # Project-level skill/command config
│   │   ├── skills/           # Skill documentation (symlinked)
│   │   └── commands/         # Slash commands
│   │
│   ├── src/
│   │   ├── cli.ts            # CLI entry point
│   │   ├── terminal.ts       # tmux pane management
│   │   │
│   │   ├── canvases/         # UI components
│   │   │   ├── index.tsx     # Canvas dispatcher
│   │   │   ├── calendar.tsx  # Calendar component
│   │   │   ├── calendar/     # Calendar sub-components
│   │   │   │   ├── hooks/    # React hooks (IPC, mouse, etc.)
│   │   │   │   ├── scenarios/# Meeting picker view
│   │   │   │   └── types.ts  # TypeScript types
│   │   │   ├── document.tsx  # Document component
│   │   │   ├── document/     # Document sub-components
│   │   │   └── flight.tsx    # Flight booking component
│   │   │
│   │   ├── ipc/              # Inter-process communication
│   │   │   ├── types.ts      # Message type definitions
│   │   │   ├── server.ts     # Canvas-side socket server
│   │   │   └── client.ts     # Controller-side client
│   │   │
│   │   ├── scenarios/        # Scenario definitions
│   │   │   ├── types.ts      # Scenario type definitions
│   │   │   ├── registry.ts   # Scenario lookup
│   │   │   ├── calendar/     # Calendar scenarios
│   │   │   └── document/     # Document scenarios
│   │   │
│   │   └── api/              # High-level API for programmatic use
│   │       └── canvas-api.ts # spawnCanvasWithIPC, pickMeetingTime, etc.
│   │
│   ├── skills/               # Original skill definitions
│   ├── commands/             # Original command definitions
│   ├── run-canvas.sh         # Wrapper script for bun
│   └── package.json          # Dependencies
│
├── CLAUDE.md                 # Bun usage instructions
└── README.md                 # Project overview
```

---

## Key Technologies

| Technology | Purpose |
|------------|---------|
| **tmux** | Terminal multiplexer for split panes |
| **Bun** | Fast JavaScript runtime and bundler |
| **Ink** | React renderer for terminal UIs |
| **Unix Domain Sockets** | Fast local IPC mechanism |
| **React** | Component-based UI architecture |
| **TypeScript** | Type safety throughout |

---

## Extending the System

### Adding a New Canvas Type

1. **Create component**: `src/canvases/mycanvas.tsx`
2. **Define types**: `src/canvases/mycanvas/types.ts`
3. **Register in dispatcher**: Update `src/canvases/index.tsx`
4. **Create scenarios**: `src/scenarios/mycanvas/*.ts`
5. **Register scenarios**: Update `src/scenarios/registry.ts`
6. **Add skill docs**: `skills/mycanvas/SKILL.md`

### Adding a New Scenario

1. **Define scenario**: Create `src/scenarios/[canvas]/[name].ts`
2. **Implement view**: Create component in `src/canvases/[canvas]/scenarios/`
3. **Register**: Add to `src/scenarios/registry.ts`
4. **Document**: Update skill markdown

---

## Limitations & Considerations

1. **tmux required**: Won't work in plain terminals
2. **Single canvas pane**: Only one canvas at a time (reuses same pane)
3. **No persistence**: Socket and pane state cleared on terminal close
4. **Terminal mouse support**: Required for click interactions
5. **Proof of concept**: Not production-ready, experimental

---

## Quick Reference: Common Operations

```bash
# Start tmux session
tmux new-session -s claude

# Show calendar in current terminal
bun run src/cli.ts show calendar

# Spawn calendar in split pane
bun run src/cli.ts spawn calendar

# Spawn with config
bun run src/cli.ts spawn document --config '{"content": "# Hello"}'

# Check environment
bun run src/cli.ts env

# Query selection from running document
bun run src/cli.ts selection document-1

# Update running canvas config
bun run src/cli.ts update calendar-1 --config '{"events": [...]}'
```
