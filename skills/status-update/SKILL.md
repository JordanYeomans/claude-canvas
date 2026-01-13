---
name: status-update
description: |
  Brief reminder to update session status panels.
  Triggers: "update status", "refresh status", "ss update"
---

# Update Session Status

**Update BEFORE returning to user** (after tool calls/interactions):

```bash
ss summary "<100+ word paragraph: what we're working on, where we are, challenges, next steps>" && \
ss done '[{"text":"Completed item 1"},{"text":"Completed item 2"},...]' && \
ss todos '[{"text":"Task","status":"done|in_progress|pending"}]' && \
ss status working|waiting|complete "<current action>"
```

**Critical fields to update:**

1. **Summary** (~100 words): Current state catch-up paragraph
2. **Done items** (5-10+ items): Running log of completed work
3. **Todos**: Current task list with status
4. **Issues** (when applicable): Problems with solutions

**Done items - IMPORTANT**:
- Update frequently as you complete steps
- Aim for 5-10+ items minimum
- Each item = a completed action (e.g., "Created auth config", "Fixed CORS issue")
- Mark current work with `"done":false`

**Example**:
```bash
ss done '[
  {"text":"Explored codebase"},
  {"text":"Read config files"},
  {"text":"Created new module"},
  {"text":"Added tests"},
  {"text":"Testing integration","done":false}
]'
```

**Status states**: `working` | `waiting` | `error` | `complete`
