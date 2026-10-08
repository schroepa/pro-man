from pathlib import Path

from promantools.parse import extract_wikilinks, parse_task_file, split_frontmatter


def test_split_frontmatter_roundtrip():
    raw = "---\nid: X\ntitle: \"Hello\"\n---\n\n# Hello\n\nBody\n"
    fm, body, has_fm = split_frontmatter(raw)
    assert has_fm is True
    assert fm["id"] == "X"
    assert fm["title"] == "Hello"
    assert body.startswith("# Hello")


def test_split_frontmatter_missing():
    fm, body, has_fm = split_frontmatter("# Only body\n")
    assert fm is None
    assert has_fm is False
    assert "Only body" in body


def test_extract_wikilinks():
    assert extract_wikilinks("Siehe [[Alpha]] und [[Beta Gamma]].") == ["Alpha", "Beta Gamma"]


def test_parse_task_with_timelogs(sample_vault_path: Path):
    task = parse_task_file(sample_vault_path / "tasks" / "ACM-WEB-1.md")
    assert task.issue_key == "ACM-WEB-1"
    assert task.client_id == "cli-acme"
    assert len(task.time_logs) == 1
    assert task.time_logs[0].hours == 2.5
    assert task.total_logged_hours() == 2.5
