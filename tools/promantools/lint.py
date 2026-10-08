from __future__ import annotations

from collections import defaultdict
from dataclasses import dataclass
from enum import Enum

from .models import Vault
from .parse import extract_wikilinks


class Severity(str, Enum):
    ERROR = "error"
    WARNING = "warning"


@dataclass(frozen=True)
class LintIssue:
    severity: Severity
    code: str
    message: str
    path: str = ""


def _rel(vault: Vault, path) -> str:
    try:
        return str(path.relative_to(vault.root))
    except ValueError:
        return str(path)


def _task_label(task) -> str:
    if task.issue_key and task.issue_key != task.id:
        return f"{task.id} / {task.issue_key}"
    return task.id


def lint_vault(vault: Vault) -> list[LintIssue]:
    issues: list[LintIssue] = []

    # Empty / missing frontmatter
    for task in vault.tasks:
        if not task.has_frontmatter:
            issues.append(
                LintIssue(
                    Severity.ERROR,
                    "empty-frontmatter",
                    f"Task ohne YAML-Frontmatter: {task.id}",
                    _rel(vault, task.path),
                )
            )
        elif not task.frontmatter:
            issues.append(
                LintIssue(
                    Severity.WARNING,
                    "empty-frontmatter",
                    f"Task mit leerem Frontmatter: {task.id}",
                    _rel(vault, task.path),
                )
            )
    for doc in vault.docs:
        if not doc.has_frontmatter:
            issues.append(
                LintIssue(
                    Severity.ERROR,
                    "empty-frontmatter",
                    f"Doc ohne YAML-Frontmatter: {doc.id}",
                    _rel(vault, doc.path),
                )
            )

    # Orphaned clientId / projectId
    for task in vault.tasks:
        if task.client_id and task.client_id not in vault.clients:
            issues.append(
                LintIssue(
                    Severity.ERROR,
                    "orphan-client",
                    f"Unbekannte clientId `{task.client_id}` bei {_task_label(task)}",
                    _rel(vault, task.path),
                )
            )
        if task.project_id and task.project_id not in vault.projects:
            issues.append(
                LintIssue(
                    Severity.ERROR,
                    "orphan-project",
                    f"Unbekannte projectId `{task.project_id}` bei {_task_label(task)}",
                    _rel(vault, task.path),
                )
            )
        if (
            task.project_id
            and task.client_id
            and task.project_id in vault.projects
            and vault.projects[task.project_id].client_id
            and vault.projects[task.project_id].client_id != task.client_id
        ):
            issues.append(
                LintIssue(
                    Severity.WARNING,
                    "client-project-mismatch",
                    f"projectId `{task.project_id}` gehört nicht zu clientId `{task.client_id}` ({_task_label(task)})",
                    _rel(vault, task.path),
                )
            )

    for doc in vault.docs:
        if doc.client_id and doc.client_id not in vault.clients:
            issues.append(
                LintIssue(
                    Severity.ERROR,
                    "orphan-client",
                    f"Unbekannte clientId `{doc.client_id}` bei Doc {doc.id}",
                    _rel(vault, doc.path),
                )
            )
        if doc.project_id and doc.project_id not in vault.projects:
            issues.append(
                LintIssue(
                    Severity.ERROR,
                    "orphan-project",
                    f"Unbekannte projectId `{doc.project_id}` bei Doc {doc.id}",
                    _rel(vault, doc.path),
                )
            )

    # Duplicate issue keys (and duplicate ids)
    by_issue: dict[str, list[str]] = defaultdict(list)
    by_id: dict[str, list[str]] = defaultdict(list)
    for task in vault.tasks:
        by_id[task.id].append(_rel(vault, task.path))
        if task.issue_key:
            by_issue[task.issue_key].append(_rel(vault, task.path))

    for task_id, paths in by_id.items():
        if len(paths) > 1:
            issues.append(
                LintIssue(
                    Severity.ERROR,
                    "duplicate-id",
                    f"Doppelte Task-id `{task_id}` in: {', '.join(paths)}",
                )
            )
    for key, paths in by_issue.items():
        if len(paths) > 1:
            issues.append(
                LintIssue(
                    Severity.ERROR,
                    "duplicate-issue-key",
                    f"Doppelter issueKey `{key}` in: {', '.join(paths)}",
                )
            )

    # Broken dependency refs
    known_ids = {t.id for t in vault.tasks} | {t.issue_key for t in vault.tasks if t.issue_key}
    for task in vault.tasks:
        for dep in task.dependencies:
            if dep not in known_ids:
                issues.append(
                    LintIssue(
                        Severity.WARNING,
                        "orphan-dependency",
                        f"Abhängigkeit `{dep}` nicht gefunden ({_task_label(task)})",
                        _rel(vault, task.path),
                    )
                )

    # Broken wikilinks (match doc title case-insensitive / includes, like the app)
    def resolve_wiki(title: str) -> bool:
        needle = title.lower()
        exact = any(d.title.lower() == needle for d in vault.docs)
        if exact:
            return True
        return any(needle in d.title.lower() for d in vault.docs)

    for task in vault.tasks:
        for link in extract_wikilinks(task.body):
            if not resolve_wiki(link):
                issues.append(
                    LintIssue(
                        Severity.WARNING,
                        "broken-wikilink",
                        f"Wikilink [[{link}]] ohne Doc-Treffer ({_task_label(task)})",
                        _rel(vault, task.path),
                    )
                )
    for doc in vault.docs:
        for link in extract_wikilinks(doc.body):
            if not resolve_wiki(link):
                issues.append(
                    LintIssue(
                        Severity.WARNING,
                        "broken-wikilink",
                        f"Wikilink [[{link}]] ohne Doc-Treffer (Doc {doc.id})",
                        _rel(vault, doc.path),
                    )
                )

    severity_rank = {Severity.ERROR: 0, Severity.WARNING: 1}
    issues.sort(key=lambda i: (severity_rank[i.severity], i.code, i.path, i.message))
    return issues


def render_lint(issues: list[LintIssue]) -> str:
    if not issues:
        return "Vault-Lint: OK (keine Findings).\n"

    errors = sum(1 for i in issues if i.severity == Severity.ERROR)
    warnings = sum(1 for i in issues if i.severity == Severity.WARNING)
    lines = [f"Vault-Lint: {errors} error(s), {warnings} warning(s)", ""]
    for issue in issues:
        loc = f"  [{issue.path}]" if issue.path else ""
        lines.append(f"{issue.severity.value.upper():7} {issue.code:24} {issue.message}{loc}")
    lines.append("")
    return "\n".join(lines)


def lint_exit_code(issues: list[LintIssue]) -> int:
    return 1 if any(i.severity == Severity.ERROR for i in issues) else 0
