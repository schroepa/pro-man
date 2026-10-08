"""
ProMan local MCP server (stdio) for Claude Desktop / Cursor.

Vault path: env PROMAN_VAULT, or pass vault= on each tool call.

Run:
  PROMAN_VAULT=/path/to/vault proman-mcp
  # or
  PROMAN_VAULT=/path/to/vault python -m promantools.mcp_server
"""

from __future__ import annotations

import sys


def build_mcp():
    try:
        from mcp.server.fastmcp import FastMCP
    except ImportError as exc:  # pragma: no cover
        raise SystemExit(
            "mcp package missing. Install with:\n"
            '  cd tools && pip install -e ".[mcp]"\n'
        ) from exc

    from . import mcp_tools as T

    mcp = FastMCP(
        "proman",
        instructions=(
            "Local-first ProMan vault tools. Source of truth is Markdown on disk. "
            "Prefer list_tasks / get_task for work; create_task / update_task to change. "
            "See docs/AI.md in the ProMan repo for schema."
        ),
    )

    @mcp.tool()
    def vault_info(vault: str | None = None) -> str:
        """Summary counts for the connected ProMan vault."""
        return T.vault_info(vault)

    @mcp.tool()
    def list_tasks(
        vault: str | None = None,
        status: str | None = None,
        client_id: str | None = None,
        include_archived: bool = False,
        limit: int = 100,
    ) -> str:
        """List tasks as JSON (no bodies). Filter by status / client_id."""
        return T.list_tasks(vault, status, client_id, include_archived, limit)

    @mcp.tool()
    def get_task(key: str, vault: str | None = None) -> str:
        """Return full Markdown of a task by id or issueKey."""
        return T.get_task(key, vault)

    @mcp.tool()
    def list_docs(vault: str | None = None, limit: int = 100) -> str:
        """List docs (id, title, client/project) as JSON."""
        return T.list_docs(vault, limit)

    @mcp.tool()
    def get_doc(doc_id: str, vault: str | None = None) -> str:
        """Return full Markdown of a doc by id."""
        return T.get_doc(doc_id, vault)

    @mcp.tool()
    def vault_report(vault: str | None = None, as_of: str | None = None) -> str:
        """Overdue / cycle / time / weekly digest Markdown report."""
        return T.vault_report(vault, as_of)

    @mcp.tool()
    def lint_vault(vault: str | None = None) -> str:
        """Integrity lint (orphans, duplicate keys, wikilinks, deps)."""
        return T.lint_vault_tool(vault)

    @mcp.tool()
    def create_task(
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
        """Create a task Markdown file. tags/dependencies are comma-separated."""
        return T.create_task_tool(
            title,
            vault,
            status,
            priority,
            client_id,
            project_id,
            assignee_id,
            due_date,
            issue_key,
            body,
            tags,
            dependencies,
            cycle,
        )

    @mcp.tool()
    def update_task(
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
        """Update fields on an existing task (by id or issueKey)."""
        return T.update_task_tool(
            key,
            vault,
            title,
            status,
            priority,
            assignee_id,
            due_date,
            body,
            tags,
            dependencies,
            cycle,
            client_id,
            project_id,
        )

    @mcp.tool()
    def create_doc(
        title: str,
        vault: str | None = None,
        body: str = "",
        client_id: str | None = None,
        project_id: str | None = None,
        doc_id: str | None = None,
    ) -> str:
        """Create a docs/DOC-*.md file."""
        return T.create_doc_tool(title, vault, body, client_id, project_id, doc_id)

    return mcp


def main() -> None:
    # Never print to stdout except MCP protocol — FastMCP owns stdio.
    try:
        mcp = build_mcp()
    except SystemExit as exc:
        print(str(exc), file=sys.stderr)
        raise
    mcp.run(transport="stdio")


if __name__ == "__main__":
    main()
