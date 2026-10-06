# ProMan

**Local-First Project Management** — Kanban, Liste, Gantt, Kalender, Docs und Backoffice. Speicherung als Markdown (Obsidian-kompatibel) über die File System Access API. Vanilla TypeScript + Vite, kein Backend, keine Telemetrie.

| | |
|---|---|
| **Version** | 0.3.0 |
| **Stack** | TypeScript, Vite 6, Vitest, happy-dom, axe-core |
| **UI** | Eigenes Token-System (kein Tailwind/Shadcn) |
| **Typo** | Geist + Geist Mono (self-hosted, variable woff2) |
| **i18n** | Deutsch / Englisch |
| **Lizenz-Daten** | Lokal im Browser / Vault auf der Festplatte |

> **Lebende Dokumentation:** `README.md`, `docs/*`, `CHANGELOG.md`, `CONTRIBUTING.md` und `SECURITY.md` werden bei relevanten Änderungen am Code mitgepflegt. Stand der Doku = Stand des Repos.

---

## Inhaltsverzeichnis

1. [Schnellstart](#schnellstart)
2. [Architektur](#architektur)
3. [Features](#features)
4. [Vault & Persistenz](#vault--persistenz)
5. [Issue-Keys](#issue-keys)
6. [Design-System](#design-system) → detailliert in [`docs/DESIGN.md`](./docs/DESIGN.md)
7. [Roadmap](#roadmap) → [`docs/ROADMAP.md`](./docs/ROADMAP.md)
8. [Accessibility](#accessibility)
9. [Tests](#tests)
10. [Scripts](#scripts)
11. [Tastaturkürzel](#tastaturkürzel)
12. [Sicherheit](#sicherheit)
13. [Mitwirken](#mitwirken)

---

## Schnellstart

```bash
npm install
npm run dev      # http://127.0.0.1:5173
npm test
npm run build
```

Chrome/Edge empfohlen (File System Access API für Vault).

Vault verbinden: Sidebar → **Vault verbinden** → Ordner wählen (z. B. `vault-example/`).

---

## Architektur

```
src/
  main.ts                 # Bootstrap, View-Routing, Shortcuts
  a11y/                   # Live-Announcer + A11y-Tests
  components/             # Topbar, Sidebar, Dialog, Select, Toast, Palette, Cards
  views/                  # Kanban, List, Gantt, Calendar, Docs, Client, Backoffice
  storage/                # AppStore, Vault FS, Serializer, Theme, Sidebar-Layout
  types/                  # Task, Client, Project, Doc, Member
  styles/                 # fonts.css, tokens.css, reset, base, components/*
  i18n/                   # de / en
  design/                 # Design-Integritäts-Tests
  ux/                     # UX-Vertrags-Tests
  test/                   # Shared Test-Helpers + Setup
public/
  fonts/                  # Geist-Variable.woff2, GeistMono-Variable.woff2
  sw.js                   # PWA App-Shell Cache
vault-example/            # Beispiel-Vault
docs/                     # Lebende Design- & Architekturdoku
```

### Prinzipien

- **Local-First:** Quelle der Wahrheit ist der Vault (oder `localStorage`-Fallback).
- **Vanilla UI:** keine UI-Library; alles über Design Tokens.
- **Zero-Border (ruhende Flächen):** Hierarchie über Surfaces, Elevation und Typo — nicht über Rahmen.
- **Tintfield-kompatibel:** 12-stufige Neutral- und Brand-Skalen austauschbar.

Datenfluss: Views/Components → `AppStore` → Serializer → `VaultStorage` (FS API) oder localStorage.

---

## Features

| Ansicht | Fähigkeiten |
|---|---|
| **Kanban** | Spalten (Default oder projektbezogen), DnD + Keyboard, Subtasks inline, KPI-Filter |
| **Liste** | Sortierung, Mehrfachauswahl, Bulk Status/Priorität, CSV-Import/Export, ICS-Export |
| **Gantt** | Bar-Drag, Start-/End-Resize, Zoom, Today |
| **Kalender** | Monatsraster nach `dueDate` |
| **Docs** | Markdown, Auto-Save, Wikilinks, Parent-Hierarchie, Print-CSS |
| **Kunde** | Eigene Seite pro Client: Stammdaten, Kontakte, Projekte, KPIs; CTAs zu Board/Docs |
| **Backoffice** | Kunden anlegen/löschen, Theme-Presets (Tintfield), Squircle-Tester |

Weitere Module:

- **Filter:** Client, Projekt, Priorität, Schnellfilter, Status, Zuweisung, Cycle — Progressive Disclosure im Filter-Popover
- **Kunden-Navigation:** Sidebar-Klick / Breadcrumb / ⌘K „Kunde: …“ öffnet die Kunden-Seite (nicht nur Board-Filter)
- **⌘K Command Palette** + Shortcut-Hilfe
- **Assignees / Members**, Favoriten-Projekte
- **Task-Dialog:** CustomSelects (keine nativen `<select>`), Anhänge, Kommentare, Zeiterfassung, Recurrence, Git-URL, Duplizieren
- **Undo/Redo** für Task-CRUD/Status/Reorder
- **Theme** Light/Dark + manuelles `data-theme`
- **PWA** Service Worker (App-Shell)

### Domänenregeln (Auszug)

- Parent-Task darf nicht **Done** werden, solange Subtasks offen sind (Toast).
- Abhängigkeitszyklen werden beim Speichern blockiert.
- Recurrence: beim Done wird eine Folgeinstanz angelegt.
- Neue Tasks: Issue-Key folgt dem gewählten Kunden/Projekt (Re-Key bei Wechsel).

---

## Vault & Persistenz

```
mein-vault/
  clients.json            # clients, projects, members
  tasks/<ISSUE-KEY>.md    # YAML-Frontmatter + Body
  docs/DOC-*.md
  attachments/            # optionale Binärdateien
```

- Root-`TASK-*.md` werden noch gelesen (Kompatibilität); neue Tasks landen unter `tasks/`.
- Ohne Vault: Persistenz in `localStorage`.
- Schema.org-Microdata auf Task-Karten; Frontmatter enthält `schemaOrg`.

---

## Issue-Keys

Format: `CLIENT[-PROJECT]-N` (unbounded), z. B. `ACM-WEB-1`, `SWT-APP-12`, `ACM-WEB-1000`.

- Codes aus Kunden-/Projekt-Kürzel (`code`), sonst Ableitung aus dem Namen.
- Sequenz wächst ohne Cap bei 999.
- Bei **neuen** Tasks wird der Key bei Kunde-/Projektwechsel neu vergeben.

---

## Design-System

Kurzüberblick — **vollständige Spezifikation:** [`docs/DESIGN.md`](./docs/DESIGN.md).

| Schicht | Rolle |
|---|---|
| **Primitives** | `--neutral-1…12`, `--brand-1…12` (Tintfield) |
| **Semantic Surfaces** | `canvas` → `sidebar` → `surface` → `elevated` |
| **Elevation** | Floating UI: hellere Surface (Dark), Shadow + Hairline |
| **Typo** | Geist / Geist Mono, self-hosted, `font-display: swap`, Preload nur Sans |
| **Motion** | kurze Durations, `prefers-reduced-motion` respektiert |
| **Formen** | Squircle / Concentric Radii |

### Surface-Stack (Dark)

```
canvas (neutral-1) < surface/cards (neutral-3) < elevated/menus (neutral-5)
```

Ruhe-UI bleibt zero-border; Popovers/Dialoge/Toasts nutzen `--color-bg-elevated` + `--shadow-popover` / `--shadow-overlay`.

---

## Roadmap

Prioritäten und geparkte Themen (u. a. Multi-Device/CRDT): [`docs/ROADMAP.md`](./docs/ROADMAP.md).

---

## Accessibility

- Skip-Link, `aria-live` Announcer, Focus-Ringe (`--color-focus-ring`)
- CustomSelect: Listbox-Pattern, `aria-label` an Trigger **und** Menu, Popover Top-Layer über `<dialog>`
- Toasts: `role="status"` / `role="alert"`
- Keyboard-DnD auf Kanban, reduzierte Motion
- Tests mit **axe-core** (serious/critical)

---

## Tests

```bash
npm test              # Vitest einmalig
npm run test:watch
npm run test:coverage
```

Abdeckung (Auszug):

| Bereich | Inhalt |
|---|---|
| Technik | Serializer, Issue-Keys, Subtask-Done-Block, Dependency-Cycles, Store-Filter |
| Design | Tokens, Elevation, keine nativen `<select>`, Meilenstein-Höhe, Font-Loading, Kontrast |
| UX | Filter-Popover-Position nach Remount, Dialog-Selects, Portal/Popover |
| A11y | axe auf Select/Dialog, Announcer, Toast-Roles |
| i18n | DE/EN Key-Parität |

---

## Scripts

| Script | Zweck |
|---|---|
| `npm run dev` | Vite Dev-Server |
| `npm run build` | `tsc` + Production-Build |
| `npm run preview` | Build lokal previewen |
| `npm test` | Vitest |
| `npm run test:coverage` | Coverage (v8) |

CI (GitHub Actions) läuft auf jedem Push/PR nach `main`: `npm test` + `npm run build`.

---

## Tastaturkürzel

| Shortcut | Aktion |
|---|---|
| `⌘K` | Command Palette |
| `⌘Z` / `⌘⇧Z` | Undo / Redo |
| `⌘\` | Sidebar ein-/ausklappen |
| `N` (Kontext) | Neue Aufgabe (siehe Shortcut-Hilfe in der Palette) |
| `1`–`5` | View wechseln (Board, Liste, Gantt, Kalender, Backoffice) |

Vollständige Liste: Command Palette → Shortcut-Hilfe.

---

## Sicherheit

ProMan läuft **nur lokal**: keine Telemetrie, kein Server, keine automatischen Uploads. Vault-Zugriff erfordert explizite Browser-Permission. Details: [`SECURITY.md`](./SECURITY.md).

---

## Mitwirken

Siehe [`CONTRIBUTING.md`](./CONTRIBUTING.md). Kurz:

1. Änderungen an Tokens/UI → `docs/DESIGN.md` und ggf. Design-Tests anpassen.
2. User-facing Changes → `CHANGELOG.md`.
3. Keine nativen `<select>` in der Produkt-UI; Floating UI über Elevated-Tokens.
4. Kleine, fokussierte PRs.

---

## Changelog

Siehe [`CHANGELOG.md`](./CHANGELOG.md).
