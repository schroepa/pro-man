# Changelog

Alle nennenswerten Änderungen an ProMan.

## [0.3.0] — 2026-10-05

### Features
- **Anhänge (light)**: `attachments?: {id, name, relativePath}[]` am Task; Dialog-Button „Datei anhängen“ (File Picker / `<input type=file>`); bei verbundenem Vault Kopie nach `attachments/`, sonst nur Metadaten-Hinweis
- **Wiederkehrende Aufgaben (light)**: `recurrence?: "weekly"|"monthly"|null`; beim Status *done* wird die nächste Instanz mit verschobenen Daten und Status *todo* angelegt
- **CSV-Import**: Listenansicht — Datei-Input „Import CSV“ für `id,title,status,priority,dueDate,tags` (create/update)
- **Issue-Keys**: `CLIENT[-PROJECT]-N` (unbounded); Re-Key bei Kunde-/Projektwechsel für neue Tasks
- **Letzte Vaults**: die letzten 3 Vault-Namen in `localStorage` als Hinweis neben dem Connect-Button (ohne Handle-Restore)
- **Geist + Geist Mono**: self-hosted Variable Fonts (~138 KB), Preload nur Sans, `font-display: swap`
- **CI**: GitHub Actions auf `main` — `npm test` + `npm run build`

### Improvements
- Elevation-System: `--color-bg-elevated`, stärkere Popover-/Overlay-Shadows, Hairline für Figure/Ground
- CustomSelect: Portal + Popover Top-Layer über `<dialog>`; keine nativen `<select>` mehr
- Filter-Popover: Positionierung nach Topbar-Remount (kein Jump nach 0,0)
- Meilenstein-Control: gleiche Höhe wie Inputs (32px)
- Date-Picker-Icons: token-farbene Mask; `color-scheme` folgt Theme
- Test-Suite: Technik, Design-Integrität, UX, Accessibility (axe), i18n-Parität
- Lebende Doku: `README.md`, `docs/DESIGN.md`

### Won't (bewusst nicht in diesem Stand)
- CRDT / Offline-Merge
- Notion-Import
- Linear-API-Integration
- Multi-Device-Sync

## [0.2.0] — 2026-10-05

### Features
- **Task-Kommentare**: lokale Kommentare (`id`, `author`, `body`, `createdAt`) im Task-Dialog; Persistenz als `### Kommentare` in Markdown; Roundtrip im Serializer
- **Entblockt-Toast**: beim Markieren einer Aufgabe als erledigt erscheint ein Toast für abhängige, nun freie Tasks
- **Projekt-Statusspalten**: optionale `statuses` / WIP-Limits pro Projekt; Kanban nutzt sie bei Projektfilter, sonst die Standard-4; unbekannte Status fallen auf die erste Spalte zurück
- **WIP-Anzeige**: Spaltenzählung zeigt Limit und Warnt bei Überschreitung
- **Docs-Hierarchie**: optionales `parentDocId` mit Einrückung in der Liste und Parent-Auswahl im Editor
- **PWA**: minimaler Service Worker (`public/sw.js`) für App-Shell-Caching, Registrierung in `main.ts`
- **Tastaturkürzel-Hilfe**: Befehlspaletten-Eintrag öffnet einen Kurz-Dialog mit allen Shortcuts

### Improvements
- Prioritäts-Badge auf erledigten Karten gedämpft (`badge-muted`)
- Spalten-Dots nutzen CSS-Variablen `--status-*-solid`
- Font-Stack ohne Inter (nur System-Fonts)
- Vault-Root-Scan überspringt `.obsidian` und `templates`

## [0.1.0] — 2026-10

### Shipped
- Local-First Kanban, Liste, Gantt, Kalender, Docs Hub, Backoffice
- Vault via File System Access API mit localStorage-Fallback (`tasks/`, `docs/`, `clients.json`)
- Undo/Redo, Zeiterfassung, Abhängigkeiten, Meilensteine, Cycles, Git-URL
- Mitglieder, Favoriten, Filter, Command Palette, Themes / Tintfield
