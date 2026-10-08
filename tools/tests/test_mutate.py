from __future__ import annotations

from pathlib import Path

import pytest

from promantools.mutate import create_doc, create_task, update_task
from promantools.parse import parse_doc_file, parse_task_file
from promantools.vault import load_vault


def _seed_vault(root: Path) -> Path:
    (root / "tasks").mkdir()
    (root / "docs").mkdir()
    (root / "clients.json").write_text(
        '{"clients":[{"id":"cli-acme","name":"Acme","code":"ACM"}],'
        '"projects":[{"id":"prj-web","clientId":"cli-acme","name":"Web","code":"WEB"}],'
        '"members":[{"id":"mem-alice","name":"Alice"}]}',
        encoding="utf-8",
    )
    return root


def test_create_and_update_task(tmp_path: Path):
    root = _seed_vault(tmp_path)
    created = create_task(
        root,
        title="Login fix",
        status="todo",
        priority="urgent",
        client_id="cli-acme",
        project_id="prj-web",
        assignee_id="mem-alice",
        due_date="2026-10-20",
        issue_key="ACM-WEB-42",
        body="Fix the login bug.",
        tags=["auth"],
    )
    assert created.id == "ACM-WEB-42"
    assert created.path.exists()
    assert created.path.parent.name == "tasks"

    updated = update_task(
        root,
        key="ACM-WEB-42",
        status="in-progress",
        body="Fix the login bug.\n\nWIP notes.",
    )
    assert updated.status == "in-progress"
    parsed = parse_task_file(updated.path)
    assert parsed.status == "in-progress"
    assert "WIP notes." in parsed.body


def test_create_task_rejects_duplicate_key(tmp_path: Path, sample_vault_path: Path):
    # copy one task into tmp vault
    root = _seed_vault(tmp_path)
    src = sample_vault_path / "tasks" / "ACM-WEB-1.md"
    (root / "tasks" / "ACM-WEB-1.md").write_text(src.read_text(encoding="utf-8"), encoding="utf-8")
    with pytest.raises(ValueError, match="exists"):
        create_task(root, title="Dup", issue_key="ACM-WEB-1")


def test_update_task_missing(tmp_path: Path):
    root = _seed_vault(tmp_path)
    with pytest.raises(LookupError, match="not found"):
        update_task(root, key="NOPE", status="done")


def test_create_doc(tmp_path: Path):
    root = _seed_vault(tmp_path)
    doc = create_doc(
        root,
        title="Daily 2026-10-08",
        body="## Antworten\n\nDaniel: ok",
        client_id="cli-acme",
        doc_id="DOC-100",
    )
    assert doc.path.exists()
    parsed = parse_doc_file(doc.path)
    assert parsed.id == "DOC-100"
    assert parsed.title == "Daily 2026-10-08"
    assert "Daniel: ok" in parsed.body


def test_load_vault_sees_created_task(tmp_path: Path):
    root = _seed_vault(tmp_path)
    create_task(root, title="Seen", issue_key="ACM-WEB-7", status="todo")
    vault = load_vault(root)
    keys = {t.display_key for t in vault.tasks}
    assert "ACM-WEB-7" in keys
