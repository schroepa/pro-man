# ProMan Roadmap

> **Lebende Liste.** Wird bei Prioritätswechseln und abgeschlossenen Epics aktualisiert. Kein Commitment-Datum, sondern Reihenfolge nach Nutzen × Aufwand für den lokalen Kern.

Stand: Roadmap-Kern lokal durch (auf `v0.3.0`)

---

## Jetzt sinnvoll (nächste Iterationen)

Priorisiert nach Hebel für Stabilität und Alltagstauglichkeit:

| # | Thema | Warum |
|---|---|---|
| 1 | **Smoke-Pass UX-Fixes** | First-Run + Full-App-Audit manuell gegenprüfen (Ordner, Demo clear, Dialog, Docs-Suche) |

---

## Später (bewusst geparkt)

| Thema | Status | Notiz |
|---|---|---|
| **Multi-Device Sync** | ⏸️ geparkt | Mehrere Geräte gleichzeitig; braucht Sync-Schicht, Accounts/Transport, Konflikte |
| **CRDT / Offline-Merge** | ⏸️ geparkt | Automatisches Zusammenführen paralleler Edits; hoher Komplexitätspreis, lokaler Vault-Vorteil bliebe erhalten nur mit sorgfältigem Design |
| Notion-Import | geparkt | Einmal-Migration, kein Kernnutzen |
| Linear-API | geparkt | Cloud-Kopplung widerspricht Local-First-Fokus |

**Zwischenlösung ohne CRDT:** denselben Vault-Ordner über OS-/Cloud-Sync (iCloud, Syncthing, …) spiegeln — Dateisync, keine gleichzeitige Bearbeitung.

Wenn Multi-Device/CRDT wieder aktuell wird: eigenes Spike-Doc unter `docs/`, Kriterien für Konflikte, Speicherformat und Obsidian-Kompatibilität klären, bevor Code entsteht.

---

## Done (kürzlich)

- UX-Audit A/G Findings umgesetzt: Ordner-Shell, Demo-Badge/Clear, Essentials-Dialog, kontextuelle Topbar-CTA, Docs Suche/Gruppen, Empty-Chrome, Client/Backoffice, IA-Polish, First-Success
- UX-Audit G (Full App): `docs/ux-audits/g-full-app/` (`audit.html`)
- UX-Audit A (First-time → produktiv): `docs/ux-audits/a-first-time/` (`audit.html`) + FigJam Stickies
- Kunden-Seiten: ViewMode `client`, editierbare Stammdaten/Kontakte/Projekte/KPIs, Sidebar + Breadcrumb + ⌘K
- ⌘K Search: Fuzzy-Score, Gruppen (Recent/Aktionen/Views bzw. Tasks/Docs), Recents, Home/End + scrollIntoView
- Vault-Robustheit: Permission-Demote, Reload-Denied, Abort/Unsupported-UX, Code-Normalisierung beim Load
- Performance-Pass: rAF-Notify-Coalesce, Chrome-Sparing, Lazy Views, content-visibility, Search-Debounce (Entry-JS gzip ~47 KB)
- Mobile App-Shell: Dialog-Sheet, Bottom-Nav, Edge-Swipe Drawer, Scroll-Lock, Kanban vertikal ≤768px
- Onboarding-Banner (Ordner primär / Mit Beispieldaten starten) + Empty States: Workspace leer vs. Filter leer (Board, Liste, Gantt i18n)
- Smoke-Pass Preview + Release-Tag `v0.3.0` (Demo-Daten: Board, Dialog/CustomSelect, Liste, Docs; Vault-Picker OS-nativ nicht automatisiert)
- Warm Obsidian Elevation + CustomSelect Top-Layer
- Geist / Geist Mono self-hosted
- Issue-Key Re-Key bei Kunde/Projekt
- Test-Suite (Technik, Design, UX, A11y)
- Lebende Doku (`README`, `docs/DESIGN.md`)
- GitHub Actions CI (`test` + `build`) — Run erfolgreich
