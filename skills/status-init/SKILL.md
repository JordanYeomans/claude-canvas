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

After init, set the context (chain commands for efficiency):

```bash
ss summary "<1-2 sentences describing what you're working on>" && \
ss goal "<the specific objective>" && \
ss status working "<current action>" && \
ss todos '[{"text":"<task>","status":"pending|in_progress|done"}]'
```

## Commands Reference

| Command | Purpose |
|---------|---------|
| `ss summary <text>` | Executive summary - single paragraph explaining current state |
| `ss goal <text>` | Specific objective for this session |
| `ss todos <json>` | Task list with status |
| `ss done <json>` | Completed items log |
| `ss issues <json>` | Problems encountered |
| `ss status <state> [msg]` | Status bar: working/waiting/error/complete |

## Summary Field - Critical Guidance

**Purpose**: The summary is a "catch-up paragraph" for someone returning to the terminal.

**When to update**: After a batch of tool calls and interactions, just before returning to the user.

**Length**: ~100 words minimum (4-6 sentences)

**Content**: Single paragraph that answers:
- What are we working on?
- Where are we currently in the process?
- What's the context someone needs to understand the current state?
- What challenges have we encountered?
- What's coming next?

**Good Examples**:

```bash
ss summary "We are implementing OAuth2 authentication with Google and GitHub providers for the web application. We have completed the provider configuration by setting up client IDs and secrets in the environment variables, and created the OAuth callback handlers. Currently, we are building the login endpoints that will redirect users to the appropriate provider. We encountered a CORS issue when testing the Google flow, which was resolved by adding the callback URL to the allowed origins. The next steps are to implement token refresh logic and add session management with Redis."
```

```bash
ss summary "We are refactoring the legacy payment processing system to use the new Stripe integration. The old system used direct credit card processing which is being deprecated. We have successfully migrated the customer data to Stripe Customer objects and updated the database schema to store Stripe IDs. Currently working through the checkout flow to replace the old payment form with Stripe Elements. We discovered that the old system had hardcoded currency assumptions, which we are now fixing to support multi-currency. After checkout is complete, we still need to migrate the subscription management and webhook handlers."
```

```bash
ss summary "We are debugging a performance issue in the data processing pipeline that is causing timeouts on large datasets. Initial profiling revealed that the bottleneck is in the JSON serialization step, which is processing each record individually. We have implemented batch processing to handle 1000 records at a time, reducing the processing time from 45 seconds to 8 seconds in our tests. Currently validating that the batching approach works correctly with edge cases like partial batches and error handling. We found one issue where failed batches were not being retried properly, which is now fixed. The final step is to run the full test suite and deploy to staging."
```

**NOT this**: "Working on auth" ❌ (too brief, no context)
**NOT this**: "We started by researching OAuth2, then we configured the providers, then we added the endpoints, then we..." ❌ (too detailed/historical, reads like a timeline not a summary)

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

1. **Update done items frequently** - Add to the list as you complete tasks (aim for 5-10 items minimum)
2. **Maintain todos** - Update status as tasks progress (done → hidden, in_progress → shown)
3. **Log issues** - Track problems with solutions
4. **Update summary** - Refresh before returning to user (100+ words)
5. **Use status bar** - Set to `waiting` when you need user input
6. Git changes update automatically via daemon

## Done Items - Important

The "done" list is a **running log of completed work**. Update it frequently (after completing major steps):

**Good example** (10+ items):
```bash
ss done '[
  {"text":"Explored codebase structure"},
  {"text":"Identified authentication files"},
  {"text":"Read OAuth2 documentation"},
  {"text":"Created auth provider config"},
  {"text":"Set up Google OAuth credentials"},
  {"text":"Set up GitHub OAuth credentials"},
  {"text":"Implemented callback handler"},
  {"text":"Added session middleware"},
  {"text":"Created login endpoint"},
  {"text":"Testing OAuth flow","done":false}
]'
```

**Not this** (too sparse):
```bash
ss done '[{"text":"Working on auth"}]'
```
