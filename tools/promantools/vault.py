from __future__ import annotations

import json
from pathlib import Path

from .models import Client, Member, Project, Vault
from .parse import parse_doc_file, parse_task_file


def _load_clients_json(path: Path, vault: Vault) -> None:
    if not path.is_file():
        return
    data = json.loads(path.read_text(encoding="utf-8"))
    for raw in data.get("clients") or []:
        if not isinstance(raw, dict) or not raw.get("id"):
            continue
        vault.clients[str(raw["id"])] = Client(
            id=str(raw["id"]),
            name=str(raw.get("name") or raw["id"]),
            code=str(raw.get("code") or ""),
        )
    for raw in data.get("projects") or []:
        if not isinstance(raw, dict) or not raw.get("id"):
            continue
        vault.projects[str(raw["id"])] = Project(
            id=str(raw["id"]),
            client_id=str(raw.get("clientId") or ""),
            name=str(raw.get("name") or raw["id"]),
            code=str(raw.get("code") or ""),
        )
    for raw in data.get("members") or []:
        if not isinstance(raw, dict) or not raw.get("id"):
            continue
        vault.members[str(raw["id"])] = Member(
            id=str(raw["id"]),
            name=str(raw.get("name") or raw["id"]),
        )


def _collect_task_paths(root: Path) -> list[tuple[Path, bool]]:
    """Return (path, archived) for task markdown files."""
    found: list[tuple[Path, bool]] = []
    seen: set[Path] = set()

    def add(path: Path, archived: bool) -> None:
        resolved = path.resolve()
        if resolved in seen or not path.is_file():
            return
        seen.add(resolved)
        found.append((path, archived))

    tasks_dir = root / "tasks"
    if tasks_dir.is_dir():
        for path in sorted(tasks_dir.glob("*.md")):
            add(path, False)
        archive_dir = tasks_dir / "archive"
        if archive_dir.is_dir():
            for path in sorted(archive_dir.glob("*.md")):
                add(path, True)

    # Legacy root TASK-*.md (compat with older vaults)
    for path in sorted(root.glob("TASK-*.md")):
        add(path, False)

    return found


def load_vault(root: Path | str) -> Vault:
    root_path = Path(root).expanduser().resolve()
    if not root_path.is_dir():
        raise FileNotFoundError(f"Vault not found: {root_path}")

    vault = Vault(root=root_path)
    _load_clients_json(root_path / "clients.json", vault)

    for path, archived in _collect_task_paths(root_path):
        vault.tasks.append(parse_task_file(path, archived=archived))

    docs_dir = root_path / "docs"
    if docs_dir.is_dir():
        for path in sorted(docs_dir.glob("*.md")):
            vault.docs.append(parse_doc_file(path))

    return vault
