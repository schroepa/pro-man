from promantools.lint import Severity, lint_exit_code, lint_vault


def test_lint_finds_core_issues(sample_vault):
    issues = lint_vault(sample_vault)
    codes = {i.code for i in issues}
    assert "empty-frontmatter" in codes
    assert "orphan-client" in codes
    assert "orphan-project" in codes
    assert "duplicate-issue-key" in codes
    assert "broken-wikilink" in codes
    assert "orphan-dependency" in codes


def test_lint_exit_code_on_errors(sample_vault):
    issues = lint_vault(sample_vault)
    assert any(i.severity == Severity.ERROR for i in issues)
    assert lint_exit_code(issues) == 1


def test_broken_wikilink_messages(sample_vault):
    issues = lint_vault(sample_vault)
    broken = [i for i in issues if i.code == "broken-wikilink"]
    messages = " ".join(i.message for i in broken)
    assert "Existiert-Nicht" in messages
    assert "Tot" in messages
    # Existing doc title should not be flagged
    assert "Anforderungsspezifikation Portal]] ohne" not in messages
