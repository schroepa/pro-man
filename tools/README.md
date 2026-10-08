# promantools

Python-Companion für ProMan-Vaults: Report, Lint, Schreiben (Tasks/Docs) und optionaler **lokaler MCP-Server** für Claude Desktop / Cursor. Liest und schreibt denselben Markdown/JSON-Ordner wie die App — **kein Backend**.

Schema für Assistenten: [`docs/AI.md`](../docs/AI.md).

## Setup

```bash
cd tools
python3 -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"          # CLI + Tests
pip install -e ".[dev,mcp]"      # + MCP-Server (FastMCP)
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

# MCP (stdio) — Vault-Pfad über Env
export PROMAN_VAULT=/absolute/path/to/mein-vault
proman-mcp
# oder: promantools mcp
```

Oder ohne Install-Script:

```bash
python -m promantools report ../vault-example
python -m promantools.mcp_server
```

Exit-Codes (report/lint): `0` ok · `1` Lint-Errors · `2` Vault nicht lesbar.

## MCP — Claude Desktop / Cursor

Tools (v1): `vault_info`, `list_tasks`, `get_task`, `list_docs`, `get_doc`, `vault_report`, `lint_vault`, `create_task`, `update_task`, `create_doc`.

### Claude Desktop (`claude_desktop_config.json`)

```json
{
  "mcpServers": {
    "proman": {
      "command": "/absolute/path/to/pro-man/tools/.venv/bin/proman-mcp",
      "env": {
        "PROMAN_VAULT": "/absolute/path/to/mein-vault"
      }
    }
  }
}
```

### Cursor (`.cursor/mcp.json` im Projekt oder User-Config)

```json
{
  "mcpServers": {
    "proman": {
      "command": "/absolute/path/to/pro-man/tools/.venv/bin/proman-mcp",
      "env": {
        "PROMAN_VAULT": "/absolute/path/to/mein-vault"
      }
    }
  }
}
```

Nach Config-Änderung Host neu starten. Absolute Pfade verwenden. Optional kann jedes Tool `vault=` überschreiben.

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

- Local-First Companion — keine Cloud-API.
- MCP schreibt Tasks/Docs atomar (Temp→Replace); kein Löschen, kein Attachment-Upload in v1.
- Alltags-UI: App Backoffice → **Prüfen & Bericht** (+ **Für KI teilen**).
- Geparkt: Bulk-Cleanup, Import-Brücken, Timesheet-PDF, Knowledge-MCP.
