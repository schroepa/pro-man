from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path
from typing import Any


@dataclass(frozen=True)
class Client:
    id: str
    name: str
    code: str = ""


@dataclass(frozen=True)
class Project:
    id: str
    client_id: str
    name: str
    code: str = ""


@dataclass(frozen=True)
class Member:
    id: str
    name: str = ""


@dataclass(frozen=True)
class Doc:
    id: str
    title: str
    path: Path
    client_id: str | None = None
    project_id: str | None = None
    body: str = ""
    has_frontmatter: bool = True


@dataclass
class TimeLog:
    id: str = ""
    hours: float = 0.0
    date: str = ""
    description: str = ""


@dataclass
class Task:
    id: str
    path: Path
    title: str = ""
    status: str = "todo"
    priority: str = "normal"
    start_date: str | None = None
    due_date: str | None = None
    client_id: str | None = None
    project_id: str | None = None
    assignee_id: str | None = None
    issue_key: str | None = None
    cycle: str | None = None
    estimate_hours: float | None = None
    time_spent_hours: float | None = None
    time_logs: list[TimeLog] = field(default_factory=list)
    tags: list[str] = field(default_factory=list)
    dependencies: list[str] = field(default_factory=list)
    archived: bool = False
    archived_at: str | None = None
    body: str = ""
    has_frontmatter: bool = True
    frontmatter: dict[str, Any] = field(default_factory=dict)

    @property
    def display_key(self) -> str:
        return self.issue_key or self.id

    @property
    def is_done(self) -> bool:
        return self.status == "done"

    def total_logged_hours(self) -> float:
        logged = sum(tl.hours for tl in self.time_logs)
        if logged > 0:
            return logged
        return float(self.time_spent_hours or 0.0)


@dataclass
class Vault:
    root: Path
    clients: dict[str, Client] = field(default_factory=dict)
    projects: dict[str, Project] = field(default_factory=dict)
    members: dict[str, Member] = field(default_factory=dict)
    tasks: list[Task] = field(default_factory=list)
    docs: list[Doc] = field(default_factory=list)

    def active_tasks(self) -> list[Task]:
        return [t for t in self.tasks if not t.archived]

    def client_name(self, client_id: str | None) -> str:
        if not client_id:
            return "—"
        client = self.clients.get(client_id)
        return client.name if client else f"?{client_id}"

    def project_name(self, project_id: str | None) -> str:
        if not project_id:
            return "—"
        project = self.projects.get(project_id)
        return project.name if project else f"?{project_id}"
