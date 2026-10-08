from __future__ import annotations

import json
from pathlib import Path

import pytest

from promantools import mcp_tools as T


def test_list_and_get_task(sample_vault_path: Path, monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setenv("PROMAN_VAULT", str(sample_vault_path))
    info = json.loads(T.vault_info())
    assert info["tasks_total"] >= 3
    assert info["docs"] >= 1

    rows = json.loads(T.list_tasks(status="in-progress"))
    assert any(r["issueKey"] == "ACM-WEB-1" for r in rows)

    md = T.get_task("ACM-WEB-1")
    assert "Überfällige Login-Seite" in md
    assert md.startswith("---")


def test_report_and_lint(sample_vault_path: Path):
    report = T.vault_report(str(sample_vault_path), as_of="2026-10-08")
    assert "Überfällig" in report or "Overdue" in report or "##" in report

    lint = T.lint_vault_tool(str(sample_vault_path))
    assert isinstance(lint, str)


def test_create_update_via_tools(tmp_path: Path, monkeypatch: pytest.MonkeyPatch):
    (tmp_path / "tasks").mkdir()
    (tmp_path / "docs").mkdir()
    (tmp_path / "clients.json").write_text(
        '{"clients":[],"projects":[],"members":[]}', encoding="utf-8"
    )
    monkeypatch.setenv("PROMAN_VAULT", str(tmp_path))

    created = json.loads(
        T.create_task_tool(
            title="MCP Task",
            issue_key="INT-MCP-1",
            status="todo",
            body="From MCP",
        )
    )
    assert created["ok"] is True
    assert created["id"] == "INT-MCP-1"

    updated = json.loads(T.update_task_tool("INT-MCP-1", status="in-progress"))
    assert updated["status"] == "in-progress"
    assert "in-progress" in T.get_task("INT-MCP-1")

    doc = json.loads(T.create_doc_tool(title="Note", body="Hello", doc_id="DOC-MCP"))
    assert doc["id"] == "DOC-MCP"
    assert "Hello" in T.get_doc("DOC-MCP")


def test_resolve_vault_requires_env(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.delenv("PROMAN_VAULT", raising=False)
    with pytest.raises(ValueError, match="PROMAN_VAULT"):
        T.resolve_vault_root()
