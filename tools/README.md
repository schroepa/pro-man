# promantools

Read-only Python-CLI für ProMan-Vaults. Liest denselben Markdown/JSON-Ordner wie die App — **ohne** Schreibzugriff und ohne Backend.

## Setup

```bash
cd tools
python3 -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"
```

## Befehle

```bash
# Report: Überfällig · Cycle · Zeit · Wochen-Digest
promantools report ../vault-example
promantools report ../mein-vault --as-of 2026-10-08
promantools report ../mein-vault --format csv -o report.csv

# Lint: Frontmatter, Orphans, doppelte Keys, Wikilinks, Dependencies
promantools lint ../vault-example
promantools lint ../mein-vault --strict   # auch Warnings → Exit 1
```

Oder ohne Install-Script:

```bash
python -m promantools report ../vault-example
```

Exit-Codes: `0` ok · `1` Lint-Errors · `2` Vault nicht lesbar.

## Was geprüft / berichtet wird

| Report | Inhalt |
|---|---|
| Überfällig | offene Tasks mit `dueDate` vor Stand-Datum (Archiv ausgeschlossen) |
| Cycle-Status | Aggregation nach `cycle` |
| Zeit | Summe `timeLogs` (sonst `timeSpentHours`) + Estimates je Kunde/Projekt |
| Wochen-Digest | Überfällig · fällig diese Woche · in Arbeit · erledigt diese Woche |

| Lint-Code | Schwere |
|---|---|
| `empty-frontmatter` | error |
| `orphan-client` / `orphan-project` | error |
| `duplicate-id` / `duplicate-issue-key` | error |
| `client-project-mismatch` | warning |
| `orphan-dependency` | warning |
| `broken-wikilink` | warning |

Wikilink-Auflösung entspricht der App: Doc-Titel exact (case-insensitive), sonst `includes`.

## Tests

```bash
pytest
```

## Absicht / Nicht-Ziele

- **Nur lesen** — kein Bulk-Cleanup, kein Import-Schreiben (kommt ggf. später).
- Companion am Vault für Automation/CI — **Alltags-UI** liegt in der App: Backoffice → **Prüfen & Bericht**.
- Geplant später: Import-Brücken, Cleanup, Timesheet-PDF, Knowledge-Seed.
