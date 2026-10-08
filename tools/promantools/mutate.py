"""Create / update vault Markdown files (atomic write)."""

from __future__ import annotations

import re
from pathlib import Path

from .models import Doc, Task
from .parse import parse_task_file
from .serialize import doc_to_markdown, task_to_markdown
from .vault import load_vault

_SAFE_KEY = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._-]*$")


def _atomic_write(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(path.suffix + ".tmp")
    tmp.write_text(content, encoding="utf-8")
    tmp.replace(path)


def _normalize_key(key: str) -> str:
    key = key.strip()
    if not key or not _SAFE_KEY.match(key):
        raise ValueError(f"Invalid key (use letters/digits/._-): {key!r}")
    return key


def _find_task(vault_root: Path, key: str) -> Task:
    vault = load_vault(vault_root)
    key_l = key.lower()
    for task in vault.tasks:
        if task.id.lower() == key_l or (task.issue_key and task.issue_key.lower() == key_l):
            return task
        if task.path.stem.lower() == key_l:
            return task
    raise LookupError(f"Task not found: {key}")


def create_task(
    vault_root: Path | str,
    *,
    title: str,
    status: str = "todo",
    priority: str = "normal",
    client_id: str | None = None,
    project_id: str | None = None,
    assignee_id: str | None = None,
    due_date: str | None = None,
    start_date: str | None = None,
    issue_key: str | None = None,
    body: str = "",
    tags: list[str] | None = None,
    dependencies: list[str] | None = None,
    cycle: str | None = None,
) -> Task:
    root = Path(vault_root).expanduser().resolve()
    key = _normalize_key(issue_key or title.replace(" ", "-")[:40])
    # Prefer explicit issue_key as file stem / id
    task_id = _normalize_key(issue_key) if issue_key else key

    vault = load_vault(root)
    for existing in vault.tasks:
        if existing.id == task_id or existing.issue_key == task_id or existing.path.stem == task_id:
            raise ValueError(f"Task already exists: {task_id}")

    path = root / "tasks" / f"{task_id}.md"
    task = Task(
        id=task_id,
        path=path,
        title=title.strip() or task_id,
        status=status,
        priority=priority,
        start_date=start_date,
        due_date=due_date,
        client_id=client_id,
        project_id=project_id,
        assignee_id=assignee_id,
        issue_key=issue_key or task_id,
        cycle=cycle,
        tags=list(tags or []),
        dependencies=list(dependencies or []),
        body=body.strip(),
        frontmatter={"order": len(vault.active_tasks())},
    )
    _atomic_write(path, task_to_markdown(task))
    return parse_task_file(path)


def update_task(
    vault_root: Path | str,
    *,
    key: str,
    title: str | None = None,
    status: str | None = None,
    priority: str | None = None,
    assignee_id: str | None = None,
    due_date: str | None = None,
    start_date: str | None = None,
    body: str | None = None,
    tags: list[str] | None = None,
    dependencies: list[str] | None = None,
    cycle: str | None = None,
    client_id: str | None = None,
    project_id: str | None = None,
) -> Task:
    root = Path(vault_root).expanduser().resolve()
    task = _find_task(root, key)

    if title is not None:
        task.title = title.strip() or task.title
    if status is not None:
        task.status = status
    if priority is not None:
        task.priority = priority
    if assignee_id is not None:
        task.assignee_id = assignee_id or None
    if due_date is not None:
        task.due_date = due_date or None
    if start_date is not None:
        task.start_date = start_date or None
    if body is not None:
        task.body = body.strip()
    if tags is not None:
        task.tags = list(tags)
    if dependencies is not None:
        task.dependencies = list(dependencies)
    if cycle is not None:
        task.cycle = cycle or None
    if client_id is not None:
        task.client_id = client_id or None
    if project_id is not None:
        task.project_id = project_id or None

    _atomic_write(task.path, task_to_markdown(task))
    return parse_task_file(task.path, archived=task.archived)


def create_doc(
    vault_root: Path | str,
    *,
    title: str,
    body: str = "",
    client_id: str | None = None,
    project_id: str | None = None,
    doc_id: str | None = None,
) -> Doc:
    root = Path(vault_root).expanduser().resolve()
    vault = load_vault(root)
    if doc_id:
        did = _normalize_key(doc_id)
    else:
        n = 1
        while True:
            candidate = f"DOC-{n:03d}"
            if not any(d.id == candidate for d in vault.docs):
                did = candidate
                break
            n += 1

    if any(d.id == did for d in vault.docs):
        raise ValueError(f"Doc already exists: {did}")

    path = root / "docs" / f"{did}.md"
    doc = Doc(
        id=did,
        title=title.strip() or did,
        path=path,
        client_id=client_id,
        project_id=project_id,
        body=body.strip(),
    )
    _atomic_write(path, doc_to_markdown(doc))
    from .parse import parse_doc_file

    return parse_doc_file(path)
