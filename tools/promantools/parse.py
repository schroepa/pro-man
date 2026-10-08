from __future__ import annotations

import re
from pathlib import Path
from typing import Any

import yaml

from .models import Doc, Task, TimeLog

FRONTMATTER_RE = re.compile(r"^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$")
WIKILINK_RE = re.compile(r"\[\[([^\]]+)\]\]")


def split_frontmatter(raw: str) -> tuple[dict[str, Any] | None, str, bool]:
    """Return (frontmatter|None, body, has_frontmatter)."""
    content = raw.replace("\r\n", "\n")
    match = FRONTMATTER_RE.match(content)
    if not match:
        return None, content.strip(), False
    try:
        data = yaml.safe_load(match.group(1)) or {}
        if not isinstance(data, dict):
            data = {}
    except yaml.YAMLError:
        data = {}
    return data, (match.group(2) or "").strip(), True


def extract_wikilinks(text: str) -> list[str]:
    return [m.group(1).strip() for m in WIKILINK_RE.finditer(text or "") if m.group(1).strip()]


def _as_str(value: Any) -> str | None:
    if value is None:
        return None
    return str(value)


def _as_float(value: Any) -> float | None:
    if value is None or value == "":
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _as_str_list(value: Any) -> list[str]:
    if value is None:
        return []
    if isinstance(value, list):
        return [str(v).strip() for v in value if str(v).strip()]
    return [str(value).strip()] if str(value).strip() else []


def _parse_time_logs(raw: Any) -> list[TimeLog]:
    if not isinstance(raw, list):
        return []
    out: list[TimeLog] = []
    for item in raw:
        if not isinstance(item, dict):
            continue
        hours = _as_float(item.get("hours")) or 0.0
        out.append(
            TimeLog(
                id=str(item.get("id") or ""),
                hours=hours,
                date=str(item.get("date") or ""),
                description=str(item.get("description") or ""),
            )
        )
    return out


def title_from_body(body: str, fallback: str) -> str:
    for line in body.splitlines():
        stripped = line.strip()
        if stripped.startswith("# "):
            return stripped[2:].strip() or fallback
    return fallback


def parse_task_file(path: Path, *, archived: bool = False) -> Task:
    raw = path.read_text(encoding="utf-8")
    fallback_id = path.stem
    fm, body, has_fm = split_frontmatter(raw)

    if fm is None:
        return Task(
            id=fallback_id,
            path=path,
            title=title_from_body(body, fallback_id),
            body=body,
            has_frontmatter=False,
            archived=archived,
        )

    task_id = _as_str(fm.get("id")) or fallback_id
    title = _as_str(fm.get("title")) or title_from_body(body, task_id)
    archived_at = _as_str(fm.get("archivedAt"))
    return Task(
        id=task_id,
        path=path,
        title=title,
        status=_as_str(fm.get("status")) or "todo",
        priority=_as_str(fm.get("priority")) or "normal",
        start_date=_as_str(fm.get("startDate")),
        due_date=_as_str(fm.get("dueDate")),
        client_id=_as_str(fm.get("clientId")),
        project_id=_as_str(fm.get("projectId")),
        assignee_id=_as_str(fm.get("assigneeId")),
        issue_key=_as_str(fm.get("issueKey")),
        cycle=_as_str(fm.get("cycle")),
        estimate_hours=_as_float(fm.get("estimateHours")),
        time_spent_hours=_as_float(fm.get("timeSpentHours")),
        time_logs=_parse_time_logs(fm.get("timeLogs")),
        tags=_as_str_list(fm.get("tags")),
        dependencies=_as_str_list(fm.get("dependencies")),
        archived=archived or bool(archived_at),
        archived_at=archived_at,
        body=body,
        has_frontmatter=has_fm,
        frontmatter=fm,
    )


def parse_doc_file(path: Path) -> Doc:
    raw = path.read_text(encoding="utf-8")
    fallback_id = path.stem
    fm, body, has_fm = split_frontmatter(raw)
    if fm is None:
        return Doc(
            id=fallback_id,
            title=title_from_body(body, fallback_id),
            path=path,
            body=body,
            has_frontmatter=False,
        )
    doc_id = _as_str(fm.get("id")) or fallback_id
    title = _as_str(fm.get("title")) or title_from_body(body, doc_id)
    return Doc(
        id=doc_id,
        title=title,
        path=path,
        client_id=_as_str(fm.get("clientId")),
        project_id=_as_str(fm.get("projectId")),
        body=body,
        has_frontmatter=has_fm,
    )
