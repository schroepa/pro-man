from promantools.report import (
    cycle_status,
    overdue_tasks,
    render_report_markdown,
    time_by_client_project,
    weekly_digest,
)


AS_OF = "2026-10-08"


def test_overdue_excludes_done_and_archive(sample_vault):
    rows = overdue_tasks(sample_vault, AS_OF)
    keys = {r.key for r in rows}
    assert "ACM-WEB-1" in keys
    assert "INT-CORE-1" not in keys  # done
    assert "OLD-1" not in keys  # archived
    assert rows[0].days_overdue == 7


def test_cycle_status(sample_vault):
    cycles = {c.cycle: c for c in cycle_status(sample_vault)}
    assert cycles["Sprint 12"].total >= 2
    assert cycles["Sprint 12"].done >= 1
    assert cycles["Sprint 12"].in_progress >= 1


def test_time_prefers_timelogs(sample_vault):
    rows = time_by_client_project(sample_vault)
    acme = next(r for r in rows if r.client == "Acme Corporation")
    assert acme.hours == 2.5
    assert acme.estimate_hours == 8


def test_weekly_digest_sections(sample_vault):
    sections = {s.heading: s for s in weekly_digest(sample_vault, AS_OF)}
    overdue_keys = {t.display_key for t in sections["Überfällig"].tasks}
    assert "ACM-WEB-1" in overdue_keys
    done_keys = {t.display_key for t in sections["Erledigt diese Woche"].tasks}
    assert "INT-CORE-1" in done_keys


def test_markdown_report_contains_headers(sample_vault):
    md = render_report_markdown(sample_vault, AS_OF)
    assert "## Überfällig" in md
    assert "## Cycle-Status" in md
    assert "## Zeit pro Kunde / Projekt" in md
    assert "## Wochen-Digest" in md
    assert "ACM-WEB-1" in md
