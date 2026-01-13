#!/usr/bin/env python3
"""
GitHub PR Dashboard - Fetch Script

Fetches GitHub PRs for display in canvas triple-vertical layout.
Scans directories for .git repos, queries gh CLI for PR data, and classifies status.
Outputs JSON with formatted content for top and bottom panels.
"""

import json
import os
import subprocess
import sys
from pathlib import Path
from typing import Literal


def find_git_repos(base_path: str) -> list[str]:
    """Find all .git directories and return their parent paths."""
    repos = []
    base = Path(base_path).resolve()

    # Check if base itself is a repo
    if (base / ".git").exists():
        repos.append(str(base))

    # Check subdirectories (up to 2 levels deep for nested repos)
    for child in base.iterdir():
        if child.is_dir() and not child.name.startswith("."):
            if (child / ".git").exists():
                repos.append(str(child))
            # Also check nested repos (monorepo setups)
            for grandchild in child.iterdir():
                if grandchild.is_dir() and not grandchild.name.startswith("."):
                    if (grandchild / ".git").exists():
                        repos.append(str(grandchild))

    return repos


def get_repo_remote(repo_path: str) -> str | None:
    """Get GitHub remote owner/repo from git remote."""
    try:
        result = subprocess.run(
            ["git", "remote", "get-url", "origin"],
            cwd=repo_path,
            capture_output=True,
            text=True,
        )
        if result.returncode != 0:
            return None

        url = result.stdout.strip()
        # Parse git@github.com:owner/repo.git or https://github.com/owner/repo.git
        if "github.com" not in url:
            return None

        if url.startswith("git@"):
            # git@github.com:owner/repo.git or git@github.com-alias:owner/repo.git
            parts = url.split(":")[-1].replace(".git", "")
        else:
            # https://github.com/owner/repo.git
            parts = url.split("github.com/")[-1].replace(".git", "")

        return parts
    except Exception:
        return None


def get_current_user() -> str:
    """Get the current GitHub user login."""
    try:
        result = subprocess.run(
            ["gh", "api", "user", "--jq", ".login"],
            capture_output=True,
            text=True,
            timeout=30,
        )
        if result.returncode == 0:
            return result.stdout.strip()
    except Exception:
        pass
    return "unknown"


def fetch_authored_prs(repo: str) -> list[dict]:
    """Fetch PRs authored by user from a repo."""
    try:
        result = subprocess.run(
            [
                "gh",
                "pr",
                "list",
                "--author",
                "@me",
                "--state",
                "open",
                "--repo",
                repo,
                "--json",
                "number,title,url,mergeable,reviewDecision,reviews,comments,headRefName",
            ],
            capture_output=True,
            text=True,
            timeout=30,
        )
        if result.returncode != 0:
            return []
        return json.loads(result.stdout)
    except Exception:
        return []


def fetch_review_requested_prs(repo: str) -> list[dict]:
    """Fetch PRs where user is requested as reviewer."""
    try:
        result = subprocess.run(
            [
                "gh",
                "pr",
                "list",
                "--search",
                "review-requested:@me",
                "--state",
                "open",
                "--repo",
                repo,
                "--json",
                "number,title,url,author,headRefName",
            ],
            capture_output=True,
            text=True,
            timeout=30,
        )
        if result.returncode != 0:
            return []
        return json.loads(result.stdout)
    except Exception:
        return []


def get_last_actor(pr: dict) -> str | None:
    """Determine the last person to comment or review."""
    actors = []

    # Check reviews (sorted by submittedAt if available)
    for review in pr.get("reviews", []):
        if review.get("author", {}).get("login"):
            actors.append(review["author"]["login"])

    # Check comments
    for comment in pr.get("comments", []):
        if comment.get("author", {}).get("login"):
            actors.append(comment["author"]["login"])

    return actors[-1] if actors else None


def classify_pr_status(pr: dict, user: str) -> Literal["green", "magenta", "red"]:
    """
    Classify PR status:
    - green: Ready to merge (mergeable AND (approved OR no review required))
    - magenta: Awaiting my feedback (last actor != me OR unresolved threads)
    - red: Merge problem (conflicting OR changes requested)
    """
    mergeable = pr.get("mergeable", "UNKNOWN")
    review_decision = pr.get("reviewDecision")
    last_actor = get_last_actor(pr)

    # Red: Conflicts or changes requested
    if mergeable == "CONFLICTING":
        return "red"
    if review_decision == "CHANGES_REQUESTED":
        return "red"

    # Green: Ready to merge
    if mergeable == "MERGEABLE":
        if review_decision == "APPROVED" or review_decision in (None, ""):
            return "green"

    # Magenta (purple): Awaiting feedback (last actor is not me)
    if last_actor and last_actor.lower() != user.lower():
        return "magenta"

    # Default to magenta for uncertain states
    return "magenta"


def main():
    # Get base path from args or use current directory
    base_path = sys.argv[1] if len(sys.argv) > 1 else os.getcwd()

    # Get current user
    current_user = get_current_user()

    # Discover repos
    repos = find_git_repos(base_path)

    authored_prs = []
    review_prs = []

    for repo_path in repos:
        remote = get_repo_remote(repo_path)
        if not remote:
            continue

        repo_short = remote.split("/")[-1]

        # Fetch authored PRs
        for pr in fetch_authored_prs(remote):
            pr["_repo"] = repo_short
            pr["_remote"] = remote
            authored_prs.append(pr)

        # Fetch review-requested PRs
        for pr in fetch_review_requested_prs(remote):
            pr["_repo"] = repo_short
            pr["_remote"] = remote
            review_prs.append(pr)

    # Format top panel (authored PRs) with styled lines
    top_lines = [
        {"text": "MY PULL REQUESTS", "color": "cyan"},
        {"text": "", "color": "white"},
    ]

    for pr in authored_prs:
        status = classify_pr_status(pr, current_user)
        number = pr.get("number", "?")
        title = pr.get("title", "Unknown")[:45]
        repo = pr.get("_repo", "?")
        line_text = f"  #{number} [{repo}] {title}"
        top_lines.append({"text": line_text, "color": status})

    if len(authored_prs) == 0:
        top_lines.append({"text": "  No open PRs authored by you", "color": "gray"})

    # Add legend
    top_lines.append({"text": "", "color": "white"})
    top_lines.append({"text": "Legend: green=ready, purple=feedback, red=problem", "color": "gray"})

    # Format bottom panel (review requests) with styled lines
    bottom_lines = [
        {"text": "REVIEW REQUESTS", "color": "yellow"},
        {"text": "", "color": "white"},
    ]

    for pr in review_prs:
        author = pr.get("author", {}).get("login", "unknown")
        number = pr.get("number", "?")
        title = pr.get("title", "Unknown")[:40]
        repo = pr.get("_repo", "?")
        bottom_lines.append(
            {"text": f"  #{number} [{repo}] {title} (@{author})", "color": "white"}
        )

    if len(review_prs) == 0:
        bottom_lines.append({"text": "  No PRs awaiting your review", "color": "gray"})

    # Output JSON
    output = {
        "top": {
            "title": f"My PRs ({len(authored_prs)})",
            "lines": top_lines,
            "borderColor": "cyan",
            "titleColor": "cyan",
        },
        "bottom": {
            "title": f"Review Requests ({len(review_prs)})",
            "lines": bottom_lines,
            "borderColor": "yellow",
            "titleColor": "yellow",
        },
    }

    print(json.dumps(output))


if __name__ == "__main__":
    main()
