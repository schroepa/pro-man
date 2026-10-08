"""Serialize Task / Doc to Obsidian-compatible Markdown (aligned with app serializer)."""

from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any

from .models import Doc, Task


def _now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def _q(value: str) -> str:
    return json.dumps(value, ensure_ascii=False)


def task_to_markdown(task: Task) -> str:
    """Compact YAML frontmatter + `# Title` body — mirrors `taskToMarkdown` in the app."""
    lines: list[str] = ["---"]

    def push(key: str, value: str | int | float | bool) -> None:
        lines.append(f"{key}: {value}")

    def push_q(key: str, value: str) -> None:
        lines.append(f"{key}: {_q(value)}")

    push("id", task.id)
    if task.issue_key:
        push_q("issueKey", task.issue_key)
    push_q("title", task.title)
    push("status", task.status)
    push("priority", task.priority)
    if task.start_date:
        push("startDate", task.start_date)
    if task.due_date:
        push("dueDate", task.due_date)
    if task.client_id:
        push("clientId", task.client_id)
    if task.project_id:
        push("projectId", task.project_id)
    if task.assignee_id:
        push("assigneeId", task.assignee_id)

    order = (task.frontmatter or {}).get("order", 0)
    push("order", int(order) if isinstance(order, (int, float)) else 0)

    created = (task.frontmatter or {}).get("createdAt") or _now_iso()
    push("createdAt", str(created))
    push("updatedAt", _now_iso())

    if task.archived_at:
        push("archivedAt", task.archived_at)
    if task.estimate_hours is not None:
        push("estimateHours", task.estimate_hours)
    if task.time_spent_hours is not None:
        push("timeSpentHours", task.time_spent_hours)
    if task.cycle:
        push_q("cycle", task.cycle)

    if task.tags:
        lines.append("tags:")
        for tag in task.tags:
            lines.append(f"  - {tag}")

    if task.dependencies:
        lines.append("dependencies:")
        for dep in task.dependencies:
            lines.append(f"  - {dep}")

    if task.time_logs:
        lines.append("timeLogs:")
        for log in task.time_logs:
            lines.append(f"  - id: {log.id or 'tl'}")
            lines.append(f"    hours: {log.hours}")
            lines.append(f"    date: {log.date}")
            if log.description:
                lines.append(f"    description: {_q(log.description)}")
            lines.append(f"    createdAt: {_now_iso()}")

    lines.append("---")
    lines.append("")

    body = (task.body or "").strip()
    if body.startswith("# "):
        lines.append(body)
    else:
        lines.append(f"# {task.title}")
        if body:
            lines.append("")
            lines.append(body)

    return "\n".join(lines) + "\n"


def doc_to_markdown(doc: Doc) -> str:
    lines = [
        "---",
        f"id: {doc.id}",
        "type: doc",
        f"clientId: {doc.client_id or ''}",
        f"projectId: {doc.project_id or ''}",
        f"title: {_q(doc.title)}",
        f"createdAt: {_now_iso()}",
        f"updatedAt: {_now_iso()}",
        "tags: []",
        "---",
        "",
        (doc.body or "").strip(),
        "",
    ]
    return "\n".join(lines)


def merge_frontmatter(existing: dict[str, Any], updates: dict[str, Any]) -> dict[str, Any]:
    out = dict(existing)
    for key, value in updates.items():
        if value is None:
            continue
        out[key] = value
    out["updatedAt"] = _now_iso()
    return out
