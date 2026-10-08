# ProMan für KI-Assistenten

Kurzanleitung, damit Claude, Cursor & Co. den Vault **sehen, verstehen und ändern** können — ohne die Web-UI zu brauchen.

> **Quelle der Wahrheit** ist der Vault-Ordner auf der Festplatte (Markdown + JSON), nicht die Startseite der App. Ohne Ordnerzugriff oder Export siehst du nur Marketing/Shell.

---

## Vault-Layout

```
mein-vault/
  clients.json              # clients[], projects[], members[]
  tasks/<ISSUE-KEY>.md      # aktive Aufgaben
  tasks/archive/            # archivierte Aufgaben (nicht löschen)
  docs/DOC-*.md             # Arbeitsnotizen
  knowledge/KN-*.md         # Kunden-/Projekt-Wissen
  attachments/              # optionale Binärdateien
```

Beispiel-Vault im Repo: [`vault-example/`](../vault-example/). Team-Setup: [`TEAM-VAULT.md`](./TEAM-VAULT.md).

---

## Task-Datei (Format)

Obsidian-kompatibel: YAML-Frontmatter + `# Titel` + Beschreibung.

```markdown
---
id: TASK-001
issueKey: "ACM-WEB-1"
title: "Architektur & Design Tokens"
status: in-progress
priority: high
startDate: 2026-10-01
dueDate: 2026-10-10
clientId: cli-acme
projectId: prj-web
assigneeId: mem-alice
order: 0
createdAt: 2026-10-01T08:00:00.000Z
updatedAt: 2026-10-08T12:00:00.000Z
estimateHours: 6
cycle: "Sprint 12"
tags:
  - design-system
dependencies:
  - TASK-000
---

# Architektur & Design Tokens

Beschreibung in Markdown.

## Checkliste
- [ ] Kontrast prüfen <!-- id:sub-1 -->
- [x] Tokens anlegen <!-- id:sub-2 -->

## Kommentare
- **Alice** (2026-10-05T10:00:00.000Z): Freigabe von Anja offen <!-- id:c-1 -->
```

### Wichtige Felder

| Feld | Werte / Bedeutung |
|---|---|
| `status` | `todo` · `in-progress` · `in-review` · `done` (Projekte können Custom-Spalten haben) |
| `priority` | `urgent` · `high` · `normal` · `low` |
| `issueKey` | Anzeige-Key `CLIENT[-PROJECT]-N`, z. B. `ACM-WEB-12` |
| `id` | Stabiler Datei-/Entity-Key (nicht umbenennen ohne App) |
| `dependencies` | IDs anderer Tasks, die diese blockieren |
| `archivedAt` | gesetzt → Datei liegt unter `tasks/archive/` |

Leere optionale Felder weglassen (kein `schemaOrg` mehr in neuen Dateien). Subtask-/Kommentar-IDs in HTML-Kommentaren beibehalten.

Kanonisches Beispiel: [`vault-example/tasks/TASK-001.md`](../vault-example/tasks/TASK-001.md).

---

## `clients.json`

```json
{
  "clients": [{ "id": "cli-acme", "name": "Acme", "code": "ACM" }],
  "projects": [{ "id": "prj-web", "clientId": "cli-acme", "name": "Web", "code": "WEB" }],
  "members": [{ "id": "mem-alice", "name": "Alice" }]
}
```

- **Members** = Team (Zuweisung), **nicht** Kunden.
- Issue-Keys nutzen `code` von Client/Projekt.
- IDs stabil lassen; Umbenennen von Namen ist ok.

---

## Docs & Wissen

| Art | Pfad | Frontmatter `type` | Zweck |
|---|---|---|---|
| Doc | `docs/DOC-*.md` | `doc` | Entscheidungen, Specs, Daily-Notizen |
| Knowledge | `knowledge/KN-*.md` | `knowledge` | Wiederverwendbares Kunden-/Projektwissen (`category`) |

Wikilinks im Body: `[[Titel]]` — Auflösung case-insensitive nach Doc-Titel.

---

## Was Assistenten tun dürfen

**Erlaubt (Vault schreiben):**

- Tasks anlegen/ändern (`status`, Beschreibung, Checkliste, Kommentare, `dueDate`, Tags)
- Docs/Knowledge ergänzen
- Report/Lint lesen (`promantools` oder In-App-Export)

**Vorsichtig:**

- `clients.json` nur mit Absprache (Codes, Member-IDs)
- Gleichzeitiges Edit derselben Datei → Soft Concurrent / last-write-wins
- Keine Secrets in Docs committen oder in Chats pasten

**Nicht:**

- Binärdaten erfinden unter `attachments/`
- Cloud-API erwarten — es gibt keine; Local-First
- App-`localStorage` als Wahrheit behandeln (nur Fallback ohne Vault)

---

## Wie du Daten bekommst

1. **Ordnerzugriff** auf den Vault (beste Option für Claude Desktop / lokalen Agent)
2. **Briefing-Export** in der App: Backoffice → Prüfen & Bericht → **Für KI teilen** (ein Markdown mit Schema + offenen Tasks + Indexes)
3. **CLI:** `promantools report <vault>` / `promantools lint <vault>` — siehe [`tools/README.md`](../tools/README.md)
4. **MCP (empfohlen für Dauerarbeit):** lokaler stdio-Server `proman-mcp`

### MCP einrichten

```bash
cd tools && python3 -m venv .venv && source .venv/bin/activate
pip install -e ".[mcp]"
```

Claude Desktop / Cursor — `PROMAN_VAULT` auf den Vault-Root setzen:

```json
{
  "mcpServers": {
    "proman": {
      "command": "/ABS/PATH/pro-man/tools/.venv/bin/proman-mcp",
      "env": { "PROMAN_VAULT": "/ABS/PATH/mein-vault" }
    }
  }
}
```

Tools: `vault_info`, `list_tasks`, `get_task`, `list_docs`, `get_doc`, `vault_report`, `lint_vault`, `create_task`, `update_task`, `create_doc`. Details: [`tools/README.md`](../tools/README.md).

---

## Empfohlene Nutzung mit dem Team

| Ort | Inhalt |
|---|---|
| **Kanban / Liste** | Operative Tickets (Status, Assignee, Due) |
| **Gantt** | Abhängigkeiten und Zeitfenster |
| **Docs Hub** | Entscheidungen, Daily-Antworten mit Quelle |
| **Wissen** | Stabile Kundenfakten (Farben, Zugänge-Hinweise ohne Secrets) |
| **Externe Cockpits** | Offene Fragen an Menschen — auf Ticket-Keys verweisen, nicht doppeln |

Nach Fremd-Änderungen am Share: in der App **Neu laden**, bevor du weiter schreibst.
