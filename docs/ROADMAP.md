# ProMan Roadmap

> **Lebende Liste.** Wird bei Prioritätswechseln und abgeschlossenen Epics aktualisiert. Kein Commitment-Datum, sondern Reihenfolge nach Nutzen × Aufwand für den lokalen Kern.

Stand: **`v0.3.1`** (Smoke-Pass nach Archiv + Vault-Markdown + Live-Beschreibung)

---

## Jetzt sinnvoll (nächste Iterationen)

Priorisiert nach Hebel für Stabilität und Alltagstauglichkeit:

| # | Thema | Warum |
|---|---|---|
| 1 | **Alltag mit echtem Vault** | SWT-/Notion-Daten im Flow schärfen (Filter, Tags, Projekte) — Reibung aus dem echten Arbeiten |
| 2 | **Epic B — Anforderungen** | Anforderungen an Projekten (später Assets); Knowledge-IDs aus A als Anker |

---

## Später (bewusst geparkt)

| Thema | Status | Notiz |
|---|---|---|
| **promantools Erweiterungen** | geparkt | Import-Brücken, Bulk-Cleanup, Timesheet-PDF/Excel, Knowledge-Seed — Basis `report`+`lint` liegt unter `tools/` |
| **Multi-Device Sync** | ⏸️ geparkt | Mehrere Geräte gleichzeitig; braucht Sync-Schicht, Accounts/Transport, Konflikte |
| **CRDT / Offline-Merge** | ⏸️ geparkt | Automatisches Zusammenführen paralleler Edits; hoher Komplexitätspreis, lokaler Vault-Vorteil bliebe erhalten nur mit sorgfältigem Design |
| Notion-Import | geparkt | Einmal-Migration erledigt; kein Dauer-Feature |
| Linear-API | geparkt | Cloud-Kopplung widerspricht Local-First-Fokus |

**Zwischenlösung ohne CRDT:** denselben Vault-Ordner auf NAS/SMB (oder OS-/Cloud-Sync) teilen — Soft Concurrent mit Stale-Guardrails; kein automatisches Merge. Details: [`docs/TEAM-VAULT.md`](./TEAM-VAULT.md).

Wenn Multi-Device/CRDT wieder aktuell wird: eigenes Spike-Doc unter `docs/`, Kriterien für Konflikte, Speicherformat und Obsidian-Kompatibilität klären, bevor Code entsteht.

---

## Done (kürzlich)

- **Vault prüfen (In-App)**: Backoffice-Tab + Dashboard/⌘K-Einstieg; gleiche Report/Lint-Idee wie promantools, ohne Terminal
- **promantools MVP**: Python-CLI `tools/` — Vault-Report (Überfällig/Cycle/Zeit/Digest) + Lint (read-only)
- **Wissensmodul (Epic A)**: `KnowledgeItem` + `knowledge/`, Kategorien/Templates, B3-Merge, Sidebar + Kunden-Sektion + ⌘K, i18n de/en, Beispiel-Vault
- **Team-Vault Hardening v1**: Confirm-Dialog (Primary=Neu laden), Content-Digest, Atomic Writes, Banner mit Pfaden + „Später“
- **Team-Vault (Soft Concurrent)**: Playbook [`docs/TEAM-VAULT.md`](./TEAM-VAULT.md); Session-Identität „Ich bin …“; Fingerprint/Stale-Banner + Save-Guard; Team-Setup-Hinweis — kein Sync-Server/CRDT
- **Dashboard als Startseite (MVP)**: `currentView = "dashboard"` Default; Fokus-KPIs → Liste+Filter; Attention-Liste; Weiter Board/Liste/Favorit; Kanban ohne KPI-Leiste; Mobile-Nav Übersicht zuerst
- **Docs-Markdown angleichen**: Docs-Editor auf `MarkdownLiveField` (eine Fläche, Auto-Grow, Blur→Render, Wikilinks)
- **v0.3.1**: Aufgaben-Archiv (`tasks/archive/`), lesbare Task-Markdown, Live-Beschreibung, Markdown-Listen-Containment; Smoke-Pass manuell grün
- Team & Personen (Workspace-Members ≠ Kunden): CRUD, Intern/Extern, Dialog-Inline-Add, Backoffice-Tab
- UX-Audit A/G Findings umgesetzt: Ordner-Shell, Demo-Badge/Clear, Essentials-Dialog, kontextuelle Topbar-CTA, Docs Suche/Gruppen, Empty-Chrome, Client/Backoffice, IA-Polish, First-Success
- UX-Audit G (Full App): `docs/ux-audits/g-full-app/` (`audit.html`)
- UX-Audit A (First-time → produktiv): `docs/ux-audits/a-first-time/` (`audit.html`) + FigJam Stickies
- Kunden-Seiten: ViewMode `client`, editierbare Stammdaten/Kontakte/Projekte/KPIs, Sidebar + Breadcrumb + ⌘K
- ⌘K Search: Fuzzy-Score, Gruppen (Recent/Aktionen/Views bzw. Tasks/Docs), Recents, Home/End + scrollIntoView
- Vault-Robustheit: Permission-Demote, Reload-Denied, Abort/Unsupported-UX, Code-Normalisierung beim Load
- Performance-Pass: rAF-Notify-Coalesce, Chrome-Sparing, Lazy Views, content-visibility, Search-Debounce
- Mobile App-Shell: Dialog-Sheet, Bottom-Nav, Edge-Swipe Drawer, Scroll-Lock, Kanban vertikal ≤768px
- Onboarding-Banner + Empty States
- Smoke-Pass Preview + Release-Tag `v0.3.0`
- Warm Obsidian Elevation + CustomSelect Top-Layer
- Geist / Geist Mono self-hosted
- Issue-Key Re-Key bei Kunde/Projekt
- Test-Suite (Technik, Design, UX, A11y)
- Lebende Doku (`README`, `docs/DESIGN.md`)
- GitHub Actions CI (`test` + `build`)
