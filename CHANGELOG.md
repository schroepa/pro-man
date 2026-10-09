# Changelog

Alle nennenswerten Änderungen an ProMan.

## [Unreleased]

### Fixes
- **Kanban Drag & Drop**: Status-Verschieben bleibt sichtbar, auch wenn der Vault-Write fehlschlägt (Fallback + Notify); nach Drag kein versehentliches Task-Dialog-Öffnen
- **Vault-Restore nach Reload**: Beim Start wird `requestPermission` nicht mehr ohne User-Gesture aufgerufen — gespeicherter Ordner bleibt als „Zugriff erlauben“ sichtbar statt still als offline zu verschwinden

### Features
- **Conversion-Landing**: Überarbeitete Marketing-LP unter `/de/` und `/en/` — Unified Narrative (Solo + kleines Team), schlanker SaaS-Vergleich, CSS Product-Mocks, Dual-CTAs App + Docs; Brand-Lockups + OG-Image; Hero Breathing-Dots (Hex-Grid, radiale Welle, Maus-Ursprung, ≤4px, Auslaufen unten)
- **Marketing-Landing & Tutorials**: Landing unter `/de/` und `/en/`, App unter `/app/`; User-Docs aus Markdown (`content/docs/`) mit Hub und 4 Tutorials je Locale; PWA-Scope `/app/`
- **Für KI teilen**: Backoffice → Prüfen & Bericht — ein Markdown-Briefing (Schema, offene Tasks, Docs-/Wissen-Index, Wochen-Digest) zum Pasten an Claude/Cursor
- **Lokaler MCP-Server**: `proman-mcp` / `promantools mcp` unter `tools/` — list/get/create/update Tasks & Docs, Report, Lint; Vault via `PROMAN_VAULT` (optional `pip install -e ".[mcp]"`)
- **Workspace-Check (menschenlesbar)**: Backoffice-Tab erklärt Findings in Klartext (Was heißt das? / Was tun?), Überfällige mit „seit X Tagen“, Cycle als Fortschrittsbalken, Wochenüberblick; technische Codes nur noch im Export; Einstieg von Übersicht und ⌘K
- **Vault prüfen & Bericht (In-App)**: Backoffice-Tab — Integrität, Überfällig, Cycle, Zeit, Wochen-Digest; Markdown/CSV-Export per Klick; Einstieg von Übersicht und ⌘K (kein Terminal nötig)
- **promantools (Python CLI)**: Read-only Vault-Companion unter `tools/` — `report` (Überfällig, Cycle, Zeit, Wochen-Digest als Markdown/CSV) und `lint` (Frontmatter, Orphans, doppelte Issue-Keys, Wikilinks, Dependencies); siehe [`tools/README.md`](./tools/README.md)
- **Wissensmodul (Epic A)**: Kunden-/projektgebundenes Wissen (`knowledge/*.md`) getrennt von Docs — Kategorien + Templates, B3-Merge (Kunde read-only in Projektansicht), Sidebar-Ansicht, Kunden-Sektion, ⌘K-Gruppe; Beispiel-Vault `vault-example/knowledge/`
- **Pro-Man Branding**: Eigenes Logo (Lockup horizontal) in der Sidebar; Favicon (SVG/ICO/Apple Touch), PWA-Icons, Open-Graph-Bild; Schreibweise „Pro-Man“
- **Team-Vault Hardening**: Confirm-Dialog (Primary=Neu laden), Content-Digest im Fingerprint, Atomic Writes (Temp→Replace), Banner mit betroffenen Pfaden + „Später“
- **Team-Vault (Soft Concurrent)**: Kleine Teams am zentralen Share — Session-Identität („Ich bin …“), Stale-Banner bei Fremd-Änderungen, Save-Guard vor Überschreiben; Playbook [`docs/TEAM-VAULT.md`](./docs/TEAM-VAULT.md)
- **Dashboard als Startseite**: ViewMode `dashboard` (Default) — Fokus-KPIs (Offen · Dringend/Überfällig · Diese Woche · In Arbeit), Heute/Überfällig-Liste, Weiter-Links; KPI-Klick → Liste mit Filter; Kanban-KPI-Leiste entfernt; Mobile-Nav: Übersicht zuerst
- **Docs Live-Markdown**: Docs-Editor nutzt dieselbe Notion-artige Fläche wie die Task-Beschreibung (Klick zum Bearbeiten, Auto-Grow, formatiert nach Blur); Edit/Preview-Tabs entfernt; Wikilinks bleiben klickbar

### Improvements
- **Task-Drawer**: Tasks öffnen als rechter Drawer über die volle Viewport-Höhe (statt zentriertem Modal); Breite Desktop ⅔ · Tablet 80–92% · Mobil Fullscreen; Beschreibung ist Essential mit größerer Lesefläche; eckig (`border-radius: 0`); Beschreibung überlappt Meta-Felder nicht mehr
- **Board-Karten Beschreibung**: Snippet zeigt Plain Text ohne Markdown-Zeichen (`###`, `**`, Listenmarker, …)
- **Team-Vault Regressionstests**: Soft Concurrent Freshness/Write-Guard/Banner + Session-Identität absichern (`mockVaultFreshness`, 21 Tests)

### Docs
- **Conversion-Landing Spec**: `docs/superpowers/specs/2026-10-08-conversion-landing-design.md`
- **User-Tutorials**: `content/docs/{de,en}/` — Erste Schritte, Vault & Markdown, Alltag Views, Team-Share; Spec `docs/superpowers/specs/2026-10-08-landing-docs-design.md`
- **KI-Assistenten**: [`docs/AI.md`](./docs/AI.md) — Vault-Layout, Task-Format, Briefing-Export, MCP-Setup für Claude/Cursor
- **promantools README**: MCP-Config-Snippets, Schreib-API, Extr `.[mcp]`
- **Team-Vault Playbook**: Setup auf NAS/SMB, Rollen, Arbeitsregeln, Soft-Concurrent-Limits; Verweise in README/ROADMAP/DESIGN

## [0.3.1] — 2026-10-07

### Features
- **Aufgaben-Archiv**: „Löschen“ archiviert ins Vault `tasks/archive/`; Wiederherstellen in der Liste (Archiv-Abschnitt) und im Dialog; ⌘K durchsucht Archiv-Treffer; **Erledigt** (Board/Dialog/Liste) archiviert automatisch
- **Lesbare Task-Markdown**: kompaktes Frontmatter (ohne leere Felder / schemaOrg-Lärm), `# Titel` + Beschreibung im Body; Notion-`Aufwand` (S/M/L) → `estimateHours` (2/4/8)
- **Live-Markdown-Beschreibung**: Task-Dialog-Feld wächst mit Inhalt; Klick zum Bearbeiten, formatiert nach Blur (eine Fläche, kein Doppel-Preview)
- **Markdown-Listen/Styles**: Bullets in `<ul class="md-list">` mit Innen-Padding; Block-Elemente nicht mehr in `<p>`; QA-Task `INT-MD-1` + Fixture-Tests
- **Team & Personen**: Workspace-Members getrennt von Kunden; Intern/Extern + Rolle; Inline „+ Person“ im Task-Dialog; Backoffice-Tab zur Verwaltung
- **Kanban-Karten**: Zuweisung als Chip (Avatar-Initialen + Name) in der Meta-Zeile
- **Kunden-Seiten**: Sidebar-/Breadcrumb-/⌘K-Klick öffnet eigene Client-Ansicht mit editierbaren Stammdaten, Kontakten, Projekten und KPIs (Board/Docs-CTAs)
- **Beispieldaten-Modus**: Badge, „Beispieldaten entfernen“, Seed nur wenn nicht geklärt; First-Success-Toast nach erster eigener Aufgabe
- **Kontextuelle Topbar-CTA**: Docs → Doc, Backoffice → Kunde, Client → Board, sonst → Aufgabe
- **Docs-Liste**: Suche, Projekt-Gruppen, kompakte Titelzeilen; neue Docs ohne doppelten H1-Body

### Docs
- **UX-Audit A** (First-time → produktiv): `docs/ux-audits/a-first-time/` — findings, Report, interaktives `audit.html`; FigJam-Stickies
- **UX-Audit G** (Full App): `docs/ux-audits/g-full-app/` — Board→Liste→Kunde→Docs→Backoffice→⌘K→Dialog→Kalender/Gantt→Mobile
- **Mobile Bottom-Nav** (≤768px): Board · Liste · Gantt · Docs · Mehr (öffnet Drawer)
- **Edge-Swipe Drawer**: von links öffnen, nach links schließen; Escape + Body-Scroll-Lock

### Improvements
- **iPhone Blank-Screen (Root Cause)**: Mobile Task-Dialog setzte `display: flex` auch im geschlossenen Zustand und überdeckte die App; jetzt `display: none` wenn `:not([open])`, Sheet-Flex nur bei `[open]`
- **iPhone Blank-Screen (Defense)**: SW cached kein HTML mehr (v3); `updateViaCache: 'none'` + Controller-Reload; Inline-Watchdog; `content-visibility` nur Desktop
- **Sidebar Vault-Compact**: Status + „Ordner verbinden“ gestapelt; Label `line-clamp: 2`, CTA Ellipsis; Breite berücksichtigt Side-Margins (kein Overflow)
- **Onboarding / Ordner-Shell**: Copy ohne Vault-Jargon; Banner = Primär-CTA; Sidebar nach Dismiss kompakt („Lokal · Ordner jederzeit“); „Mit Beispieldaten starten“ + Toast
- **Task-Dialog Essentials-first**: Titel/Status/Priorität/Fällig sichtbar; Rest unter „Mehr Details“; Sheet-Header mit Issue-Key + Status-Chip; Accordion bleibt nach Kunde-/Projektwechsel offen
- **Task-Dialog Select**: Klicks auf CustomSelect-Menüs (außerhalb der Dialog-Box) schließen den Dialog nicht mehr
- **Empty Chrome**: Filterleiste bei 0 Tasks aus; KPI erst nach erster eigener Aufgabe; Demo-Banner am Board
- **Kunden/Backoffice**: Speichern sticky; Board/Docs sekundär; Badge „Primär“; Backoffice → Kunden-Seite; Status-Spalten als Zeilen-UI
- **IA**: Sidebar „n Proj.“; Gantt-Legende Priorität(+Erledigt); Listen-Zuweisung nur wenn genutzt
- **Empty States**: echter Leerstand (Board/Liste) mit „Erste Aufgabe anlegen“; Filter-Empty unverändert; Gantt-Empty i18n + CTA
- **Task-Dialog ≤640px**: Full-Height-Sheet, scrollbarer Body, sticky Footer + Safe-Area
- **Kanban Mobile**: eine Spalte, kein horizontales Board-Scroll (Swipe-Konflikt vermeiden)
- **Liste ≤640px**: Header wrappt, Tabelle horizontal scrollbar
- **Performance**: `notify()` per rAF coalesced; Chrome (Sidebar/Topbar/Nav) nur bei Nav-/Filter-/Vault-Änderungen; Lazy-Chunks für Gantt/Calendar/Docs/Backoffice; `content-visibility` auf Cards/List-Rows; ⌘K-Suche 150 ms debounced  
  - Entry-JS: ~227 KB → ~173 KB (gzip ~59 KB → ~47 KB); Backoffice ~39 KB lazy
- **Vault-Robustheit**: Schreib-/Reload-Fehler mit `NotAllowedError` demoten auf `permission_needed`; Abort-Toast; Unsupported-Hinweis ohne Connect; fehlende Client-/Projekt-Codes beim Load ableiten; partieller Load-Warn-Toast
- **⌘K Search**: Fuzzy-Match (Titel/Issue-Key/Tags), Gruppen-Header, letzte 8 Recents, Home/End + Fokus-Scroll; leere Query ohne Task-Dump

## [0.3.0] — 2026-10-06

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
