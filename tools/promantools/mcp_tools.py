"""Vault operations exposed as MCP tools (pure functions, testable without FastMCP)."""

from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any

from .lint import lint_vault, render_lint
from .mutate import create_doc, create_task, update_task
from .report import render_report_markdown
from .vault import load_vault


def resolve_vault_root(vault: str | None = None) -> Path:
    raw = vault or os.environ.get("PROMAN_VAULT")
    if not raw:
        raise ValueError(
            "No vault path: pass vault=… or set env PROMAN_VAULT to the vault root folder."
        )
    path = Path(raw).expanduser().resolve()
    if not path.is_dir():
        raise FileNotFoundError(f"Vault not found: {path}")
    return path


def vault_info(vault: str | None = None) -> str:
    root = resolve_vault_root(vault)
    v = load_vault(root)
    payload = {
        "root": str(root),
        "clients": len(v.clients),
        "projects": len(v.projects),
        "members": len(v.members),
        "tasks_active": len(v.active_tasks()),
        "tasks_total": len(v.tasks),
        "docs": len(v.docs),
    }
    return json.dumps(payload, indent=2, ensure_ascii=False)


def list_tasks(
    vault: str | None = None,
    status: str | None = None,
    client_id: str | None = None,
    include_archived: bool = False,
    limit: int = 100,
) -> str:
    v = load_vault(resolve_vault_root(vault))
    rows: list[dict[str, Any]] = []
    for task in v.tasks:
        if task.archived and not include_archived:
            continue
        if status and task.status != status:
            continue
        if client_id and task.client_id != client_id:
            continue
        rows.append(
            {
                "id": task.id,
                "issueKey": task.issue_key or task.id,
                "title": task.title,
                "status": task.status,
                "priority": task.priority,
                "dueDate": task.due_date,
                "assigneeId": task.assignee_id,
                "clientId": task.client_id,
                "projectId": task.project_id,
                "dependencies": task.dependencies,
                "archived": task.archived,
            }
        )
        if len(rows) >= max(1, min(limit, 500)):
            break
    return json.dumps(rows, indent=2, ensure_ascii=False)


def get_task(key: str, vault: str | None = None) -> str:
    v = load_vault(resolve_vault_root(vault))
    key_l = key.lower()
    for task in v.tasks:
        if task.id.lower() == key_l or (task.issue_key and task.issue_key.lower() == key_l):
            return task.path.read_text(encoding="utf-8")
    raise LookupError(f"Task not found: {key}")


def list_docs(vault: str | None = None, limit: int = 100) -> str:
    v = load_vault(resolve_vault_root(vault))
    rows = [
        {
            "id": d.id,
            "title": d.title,
            "clientId": d.client_id,
            "projectId": d.project_id,
        }
        for d in v.docs[: max(1, min(limit, 500))]
    ]
    return json.dumps(rows, indent=2, ensure_ascii=False)


def get_doc(doc_id: str, vault: str | None = None) -> str:
    v = load_vault(resolve_vault_root(vault))
    for doc in v.docs:
        if doc.id.lower() == doc_id.lower():
            return doc.path.read_text(encoding="utf-8")
    raise LookupError(f"Doc not found: {doc_id}")


def vault_report(vault: str | None = None, as_of: str | None = None) -> str:
    return render_report_markdown(load_vault(resolve_vault_root(vault)), as_of)


def lint_vault_tool(vault: str | None = None) -> str:
    return render_lint(lint_vault(load_vault(resolve_vault_root(vault))))


def create_task_tool(
    title: str,
    vault: str | None = None,
    status: str = "todo",
    priority: str = "normal",
    client_id: str | None = None,
    project_id: str | None = None,
    assignee_id: str | None = None,
    due_date: str | None = None,
    issue_key: str | None = None,
    body: str = "",
    tags: str | None = None,
    dependencies: str | None = None,
    cycle: str | None = None,
) -> str:
    tag_list = [t.strip() for t in (tags or "").split(",") if t.strip()] or None
    dep_list = [d.strip() for d in (dependencies or "").split(",") if d.strip()] or None
    task = create_task(
        resolve_vault_root(vault),
        title=title,
        status=status,
        priority=priority,
        client_id=client_id,
        project_id=project_id,
        assignee_id=assignee_id,
        due_date=due_date,
        issue_key=issue_key,
        body=body,
        tags=tag_list,
        dependencies=dep_list,
        cycle=cycle,
    )
    return json.dumps(
        {"ok": True, "id": task.id, "issueKey": task.issue_key, "path": str(task.path)},
        indent=2,
        ensure_ascii=False,
    )


def update_task_tool(
    key: str,
    vault: str | None = None,
    title: str | None = None,
    status: str | None = None,
    priority: str | None = None,
    assignee_id: str | None = None,
    due_date: str | None = None,
    body: str | None = None,
    tags: str | None = None,
    dependencies: str | None = None,
    cycle: str | None = None,
    client_id: str | None = None,
    project_id: str | None = None,
) -> str:
    tag_list = None if tags is None else [t.strip() for t in tags.split(",") if t.strip()]
    dep_list = None if dependencies is None else [d.strip() for d in dependencies.split(",") if d.strip()]
    task = update_task(
        resolve_vault_root(vault),
        key=key,
        title=title,
        status=status,
        priority=priority,
        assignee_id=assignee_id,
        due_date=due_date,
        body=body,
        tags=tag_list,
        dependencies=dep_list,
        cycle=cycle,
        client_id=client_id,
        project_id=project_id,
    )
    return json.dumps(
        {"ok": True, "id": task.id, "status": task.status, "path": str(task.path)},
        indent=2,
        ensure_ascii=False,
    )


def create_doc_tool(
    title: str,
    vault: str | None = None,
    body: str = "",
    client_id: str | None = None,
    project_id: str | None = None,
    doc_id: str | None = None,
) -> str:
    doc = create_doc(
        resolve_vault_root(vault),
        title=title,
        body=body,
        client_id=client_id,
        project_id=project_id,
        doc_id=doc_id,
    )
    return json.dumps(
        {"ok": True, "id": doc.id, "path": str(doc.path)},
        indent=2,
        ensure_ascii=False,
    )
