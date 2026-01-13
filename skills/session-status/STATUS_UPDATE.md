---
name: status-update
description: |
  Brief reminder to update session status panels.
  Triggers: "update status", "refresh status", "ss update"
---

# Update Session Status

**Quick commands:**
```bash
ss status working "<what you're doing now>"
ss todos '[{"text":"...","status":"done|in_progress|pending"}]'
ss done '[{"text":"<completed item>"}]'
ss issues '[{"text":"<problem>","fixed":true|false,"solution":"..."}]'
```

**Status states:** `working` | `waiting` | `error` | `complete`

**Remember:** Update todos when task status changes. Log issues when problems occur.
