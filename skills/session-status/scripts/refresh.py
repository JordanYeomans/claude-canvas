#!/usr/bin/env python3
"""
Refresh session status panels.
Reads state files, gathers git data, builds panel configs, and pushes updates.
"""

import json
import os
import subprocess
import sys
from pathlib import Path

CANVAS_DIR = "/Users/jordanyeomans/Documents/repos_jy/claude-canvas/canvas"


def read_file(path: Path, default: str = "") -> str:
    """Read file contents or return default."""
    try:
        return path.read_text().strip()
    except FileNotFoundError:
        return default


def read_json_list(path: Path) -> list:
    """Read JSON file as list or return empty list."""
    try:
        data = json.loads(path.read_text())
        return data if isinstance(data, list) else []
    except (FileNotFoundError, json.JSONDecodeError):
        return []


def read_json_dict(path: Path) -> dict:
    """Read JSON file as dict or return empty dict."""
    try:
        data = json.loads(path.read_text())
        return data if isinstance(data, dict) else {}
    except (FileNotFoundError, json.JSONDecodeError):
        return {}


def get_git_branch(working_dir: str) -> str:
    """Get current git branch."""
    try:
        result = subprocess.run(
            ["git", "branch", "--show-current"],
            cwd=working_dir,
            capture_output=True,
            text=True,
            timeout=5,
        )
        return result.stdout.strip() if result.returncode == 0 else ""
    except Exception:
        return ""


def get_git_changes(working_dir: str) -> list[dict]:
    """Get git status and diff stats."""
    changes = []

    try:
        # Get status (modified, added, deleted, untracked)
        status_result = subprocess.run(
            ["git", "status", "--porcelain"],
            cwd=working_dir,
            capture_output=True,
            text=True,
            timeout=10,
        )

        if status_result.returncode != 0:
            return []

        # Get numstat for additions/deletions
        numstat_result = subprocess.run(
            ["git", "diff", "--numstat", "HEAD"],
            cwd=working_dir,
            capture_output=True,
            text=True,
            timeout=10,
        )

        # Parse numstat into dict
        numstat = {}
        if numstat_result.returncode == 0:
            for line in numstat_result.stdout.strip().split("\n"):
                if line:
                    parts = line.split("\t")
                    if len(parts) >= 3:
                        adds = int(parts[0]) if parts[0] != "-" else 0
                        dels = int(parts[1]) if parts[1] != "-" else 0
                        filename = parts[2]
                        numstat[filename] = (adds, dels)

        # Parse status (split first, then handle each line - don't strip whole output)
        for line in status_result.stdout.split("\n"):
            if not line or len(line) < 4:
                continue

            status_code = line[:2].strip()
            filename = line[3:]

            # Map git status to our status codes
            if status_code == "??":
                file_status = "?"
            elif status_code.startswith("A") or status_code == "AM":
                file_status = "A"
            elif status_code.startswith("D"):
                file_status = "D"
            else:
                file_status = "M"

            change = {
                "file": filename,
                "status": file_status,
            }

            # Add numstat if available
            if filename in numstat:
                adds, dels = numstat[filename]
                change["additions"] = adds
                change["deletions"] = dels

            changes.append(change)

    except Exception as e:
        print(f"Error getting git changes: {e}", file=sys.stderr)

    # Sort by directory path (filesystem order)
    changes.sort(key=lambda c: c["file"].lower())

    return changes


def build_summary_config(state_dir: Path, working_dir: str) -> dict:
    """Build sessionSummary config for top panel."""
    summary = read_file(state_dir / "summary.txt")
    goal = read_file(state_dir / "goal.txt")
    done = read_json_list(state_dir / "done.json")
    issues = read_json_list(state_dir / "issues.json")

    branch = get_git_branch(working_dir)
    changes = get_git_changes(working_dir)

    return {
        "noBorder": True,
        "sessionSummary": {
            "type": "session-summary",
            "summary": summary or "Session in progress...",
            "goal": goal or "No goal set",
            "workingDir": working_dir,
            "branch": branch,
            "done": done,
            "issues": issues if issues else None,
            "changes": changes if changes else None,
        }
    }


def build_todo_config(state_dir: Path) -> dict:
    """Build sessionTodo config for bottom panel."""
    todos = read_json_list(state_dir / "todos.json")
    status_data = read_json_dict(state_dir / "status.json")
    start_time = read_file(state_dir / "start_time", "0")

    try:
        start_time_ms = int(start_time)
    except ValueError:
        start_time_ms = 0

    return {
        "noBorder": True,
        "sessionTodo": {
            "type": "session-todo",
            "status": status_data.get("status", "working"),
            "statusMessage": status_data.get("message", ""),
            "startTime": start_time_ms if start_time_ms > 0 else None,
            "todos": todos,
        }
    }


def push_config(session_id: str, panel_suffix: str, config: dict):
    """Push config to panel via CLI."""
    panel_id = f"{session_id}-{panel_suffix}"
    config_json = json.dumps(config)

    try:
        result = subprocess.run(
            ["bun", "run", "src/cli.ts", "update", panel_id, "--config", config_json],
            cwd=CANVAS_DIR,
            capture_output=True,
            text=True,
            timeout=10,
        )
        if result.returncode != 0:
            print(f"Error updating {panel_id}: {result.stderr}", file=sys.stderr)
    except Exception as e:
        print(f"Error pushing config to {panel_id}: {e}", file=sys.stderr)


def main():
    if len(sys.argv) < 2:
        print("Usage: refresh.py <session-id>", file=sys.stderr)
        sys.exit(1)

    session_id = sys.argv[1]
    state_dir = Path(f"/tmp/session-status-{session_id}")

    if not state_dir.exists():
        print(f"State directory not found: {state_dir}", file=sys.stderr)
        sys.exit(1)

    # Get working directory
    working_dir = read_file(state_dir / "working_dir", os.getcwd())

    # Build and push configs
    summary_config = build_summary_config(state_dir, working_dir)
    todo_config = build_todo_config(state_dir)

    push_config(session_id, "top", summary_config)
    push_config(session_id, "bottom", todo_config)


if __name__ == "__main__":
    main()
