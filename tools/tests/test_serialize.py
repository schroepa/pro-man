from __future__ import annotations

from pathlib import Path

from promantools.models import Task
from promantools.parse import parse_task_file
from promantools.serialize import task_to_markdown


def test_task_to_markdown_roundtrip(tmp_path: Path):
    task = Task(
        id="ACM-WEB-9",
        path=tmp_path / "ACM-WEB-9.md",
        title="Neue Aufgabe",
        status="todo",
        priority="high",
        start_date="2026-10-01",
        due_date="2026-10-15",
        client_id="cli-acme",
        project_id="prj-web",
        assignee_id="mem-alice",
        issue_key="ACM-WEB-9",
        cycle="Sprint 12",
        estimate_hours=4.0,
        tags=["auth"],
        dependencies=["ACM-WEB-1"],
        body="# Neue Aufgabe\n\nBeschreibung hier.",
    )
    md = task_to_markdown(task)
    assert md.startswith("---\n")
    assert 'issueKey: "ACM-WEB-9"' in md
    assert "status: todo" in md
    assert "tags:\n  - auth" in md
    assert "dependencies:\n  - ACM-WEB-1" in md
    assert "# Neue Aufgabe" in md
    assert "Beschreibung hier." in md

    out = tmp_path / "ACM-WEB-9.md"
    out.write_text(md, encoding="utf-8")
    parsed = parse_task_file(out)
    assert parsed.id == "ACM-WEB-9"
    assert parsed.issue_key == "ACM-WEB-9"
    assert parsed.status == "todo"
    assert parsed.priority == "high"
    assert parsed.client_id == "cli-acme"
    assert parsed.assignee_id == "mem-alice"
    assert parsed.tags == ["auth"]
    assert parsed.dependencies == ["ACM-WEB-1"]
    assert "Beschreibung hier." in parsed.body
