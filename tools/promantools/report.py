from __future__ import annotations

import csv
import io
from collections import defaultdict
from dataclasses import dataclass
from datetime import date, datetime, timedelta

from .models import Task, Vault


def _parse_day(value: object) -> date | None:
    if value is None or value == "":
        return None
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, date):
        return value
    try:
        text = str(value)
        return date.fromisoformat(text[:10])
    except ValueError:
        return None


def _as_of(value: str | date | None) -> date:
    if value is None:
        return date.today()
    parsed = _parse_day(value)
    if parsed is None:
        raise ValueError(f"Invalid --as-of date: {value!r}")
    return parsed


@dataclass(frozen=True)
class OverdueRow:
    key: str
    title: str
    due_date: str
    days_overdue: int
    status: str
    priority: str
    client: str
    project: str
    cycle: str


@dataclass(frozen=True)
class CycleBucket:
    cycle: str
    total: int
    todo: int
    in_progress: int
    in_review: int
    done: int
    other: int


@dataclass(frozen=True)
class TimeRow:
    client: str
    project: str
    hours: float
    estimate_hours: float
    task_count: int


@dataclass(frozen=True)
class DigestSection:
    heading: str
    tasks: list[Task]


def overdue_tasks(vault: Vault, as_of: str | date | None = None) -> list[OverdueRow]:
    today = _as_of(as_of)
    rows: list[OverdueRow] = []
    for task in vault.active_tasks():
        if task.is_done:
            continue
        due = _parse_day(task.due_date)
        if due is None or due >= today:
            continue
        rows.append(
            OverdueRow(
                key=task.display_key,
                title=task.title,
                due_date=due.isoformat(),
                days_overdue=(today - due).days,
                status=task.status,
                priority=task.priority,
                client=vault.client_name(task.client_id),
                project=vault.project_name(task.project_id),
                cycle=task.cycle or "—",
            )
        )
    rows.sort(key=lambda r: (-r.days_overdue, r.due_date, r.key))
    return rows


def cycle_status(vault: Vault) -> list[CycleBucket]:
    buckets: dict[str, dict[str, int]] = defaultdict(
        lambda: {"total": 0, "todo": 0, "in-progress": 0, "in-review": 0, "done": 0, "other": 0}
    )
    for task in vault.active_tasks():
        label = task.cycle or "(ohne Cycle)"
        b = buckets[label]
        b["total"] += 1
        if task.status in ("todo", "in-progress", "in-review", "done"):
            b[task.status] += 1
        else:
            b["other"] += 1

    out = [
        CycleBucket(
            cycle=name,
            total=vals["total"],
            todo=vals["todo"],
            in_progress=vals["in-progress"],
            in_review=vals["in-review"],
            done=vals["done"],
            other=vals["other"],
        )
        for name, vals in buckets.items()
    ]
    out.sort(key=lambda b: (b.cycle == "(ohne Cycle)", b.cycle.lower()))
    return out


def time_by_client_project(vault: Vault) -> list[TimeRow]:
    agg: dict[tuple[str, str], dict[str, float]] = defaultdict(
        lambda: {"hours": 0.0, "estimate": 0.0, "count": 0}
    )
    for task in vault.tasks:  # include archived for timesheet history
        client = vault.client_name(task.client_id)
        project = vault.project_name(task.project_id)
        key = (client, project)
        agg[key]["hours"] += task.total_logged_hours()
        agg[key]["estimate"] += float(task.estimate_hours or 0.0)
        agg[key]["count"] += 1

    rows = [
        TimeRow(
            client=client,
            project=project,
            hours=round(vals["hours"], 2),
            estimate_hours=round(vals["estimate"], 2),
            task_count=int(vals["count"]),
        )
        for (client, project), vals in agg.items()
        if vals["hours"] > 0 or vals["estimate"] > 0
    ]
    rows.sort(key=lambda r: (-r.hours, r.client, r.project))
    return rows


def weekly_digest(vault: Vault, as_of: str | date | None = None) -> list[DigestSection]:
    today = _as_of(as_of)
    week_end = today + timedelta(days=(6 - today.weekday()))  # Sunday of current week
    week_start = week_end - timedelta(days=6)

    due_this_week: list[Task] = []
    overdue: list[Task] = []
    in_progress: list[Task] = []
    recently_done: list[Task] = []

    for task in vault.active_tasks():
        due = _parse_day(task.due_date)
        if task.is_done:
            updated = _parse_day(task.frontmatter.get("updatedAt") if task.frontmatter else None)
            # Prefer updatedAt; fall back to due in week
            stamp = updated or due
            if stamp and week_start <= stamp <= week_end:
                recently_done.append(task)
            continue

        if task.status in ("in-progress", "in-review"):
            in_progress.append(task)

        if due is None:
            continue
        if due < today:
            overdue.append(task)
        elif week_start <= due <= week_end:
            due_this_week.append(task)

    def sort_tasks(items: list[Task]) -> list[Task]:
        return sorted(items, key=lambda t: (t.due_date or "9999", t.display_key))

    return [
        DigestSection("Überfällig", sort_tasks(overdue)),
        DigestSection("Fällig diese Woche", sort_tasks(due_this_week)),
        DigestSection("In Arbeit", sort_tasks(in_progress)),
        DigestSection("Erledigt diese Woche", sort_tasks(recently_done)),
    ]


def render_report_markdown(vault: Vault, as_of: str | date | None = None) -> str:
    today = _as_of(as_of)
    lines: list[str] = [
        f"# ProMan Vault-Report",
        "",
        f"- Vault: `{vault.root}`",
        f"- Stand: {today.isoformat()}",
        f"- Tasks aktiv: {len(vault.active_tasks())} · archiviert: {sum(1 for t in vault.tasks if t.archived)}",
        "",
        "## Überfällig",
        "",
    ]

    overdue = overdue_tasks(vault, today)
    if not overdue:
        lines.append("_Keine überfälligen offenen Tasks._")
        lines.append("")
    else:
        lines.append("| Key | Titel | Fällig | Tage | Status | Priorität | Kunde | Projekt |")
        lines.append("|---|---|---|---:|---|---|---|---|")
        for row in overdue:
            lines.append(
                f"| {row.key} | {row.title} | {row.due_date} | {row.days_overdue} | "
                f"{row.status} | {row.priority} | {row.client} | {row.project} |"
            )
        lines.append("")

    lines.extend(["## Cycle-Status", ""])
    cycles = cycle_status(vault)
    if not cycles:
        lines.append("_Keine Tasks._")
        lines.append("")
    else:
        lines.append("| Cycle | Total | Todo | In Progress | Review | Done | Other |")
        lines.append("|---|---:|---:|---:|---:|---:|---:|")
        for c in cycles:
            lines.append(
                f"| {c.cycle} | {c.total} | {c.todo} | {c.in_progress} | "
                f"{c.in_review} | {c.done} | {c.other} |"
            )
        lines.append("")

    lines.extend(["## Zeit pro Kunde / Projekt", ""])
    time_rows = time_by_client_project(vault)
    if not time_rows:
        lines.append("_Keine Zeiterfassung / Estimates._")
        lines.append("")
    else:
        lines.append("| Kunde | Projekt | Gebucht (h) | Estimate (h) | Tasks |")
        lines.append("|---|---|---:|---:|---:|")
        for row in time_rows:
            lines.append(
                f"| {row.client} | {row.project} | {row.hours:g} | "
                f"{row.estimate_hours:g} | {row.task_count} |"
            )
        lines.append("")

    lines.extend(["## Wochen-Digest", ""])
    for section in weekly_digest(vault, today):
        lines.append(f"### {section.heading}")
        lines.append("")
        if not section.tasks:
            lines.append("_—_")
            lines.append("")
            continue
        for task in section.tasks:
            due = task.due_date or "—"
            lines.append(
                f"- **{task.display_key}** {task.title} "
                f"({task.status}, fällig {due}, {vault.client_name(task.client_id)})"
            )
        lines.append("")

    return "\n".join(lines).rstrip() + "\n"


def render_report_csv(vault: Vault, as_of: str | date | None = None) -> str:
    """Flat CSV focused on overdue + time rows (two sections via kind column)."""
    today = _as_of(as_of)
    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(
        [
            "kind",
            "key",
            "title",
            "due_date",
            "days_overdue",
            "status",
            "priority",
            "client",
            "project",
            "cycle",
            "hours",
            "estimate_hours",
            "task_count",
            "as_of",
        ]
    )
    for row in overdue_tasks(vault, today):
        writer.writerow(
            [
                "overdue",
                row.key,
                row.title,
                row.due_date,
                row.days_overdue,
                row.status,
                row.priority,
                row.client,
                row.project,
                row.cycle,
                "",
                "",
                "",
                today.isoformat(),
            ]
        )
    for row in time_by_client_project(vault):
        writer.writerow(
            [
                "time",
                "",
                "",
                "",
                "",
                "",
                "",
                row.client,
                row.project,
                "",
                row.hours,
                row.estimate_hours,
                row.task_count,
                today.isoformat(),
            ]
        )
    for c in cycle_status(vault):
        writer.writerow(
            [
                "cycle",
                "",
                c.cycle,
                "",
                "",
                "",
                "",
                "",
                "",
                c.cycle,
                "",
                "",
                c.total,
                today.isoformat(),
            ]
        )
    return buf.getvalue()
