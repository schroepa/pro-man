# ProMan Roadmap

> **Lebende Liste.** Wird bei Prioritätswechseln und abgeschlossenen Epics aktualisiert. Kein Commitment-Datum, sondern Reihenfolge nach Nutzen × Aufwand für den lokalen Kern.

Stand: nach Mobile App-Shell (auf `v0.3.0`)

---

## Jetzt sinnvoll (nächste Iterationen)

Priorisiert nach Hebel für Stabilität und Alltagstauglichkeit:

| # | Thema | Warum |
|---|---|---|
| 1 | **Performance-Pass** | Lighthouse auf Cold-Load (Geist-Preload, Bundle, lange Listen) |
| 2 | **Vault-Robustheit** | Fehlerpfade bei Denied/Permission, Reload, fehlenden Codes |
| 3 | **Search-Qualität in ⌘K** | Fuzzy/Recent, klare Gruppen, Keyboard-only Flow |

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

- Mobile App-Shell: Dialog-Sheet, Bottom-Nav, Edge-Swipe Drawer, Scroll-Lock, Kanban vertikal ≤768px
- Onboarding-Banner (Vault primär / Loslegen) + Empty States: Workspace leer vs. Filter leer (Board, Liste, Gantt i18n)
- Smoke-Pass Preview + Release-Tag `v0.3.0` (Demo-Daten: Board, Dialog/CustomSelect, Liste, Docs; Vault-Picker OS-nativ nicht automatisiert)
- Warm Obsidian Elevation + CustomSelect Top-Layer
- Geist / Geist Mono self-hosted
- Issue-Key Re-Key bei Kunde/Projekt
- Test-Suite (Technik, Design, UX, A11y)
- Lebende Doku (`README`, `docs/DESIGN.md`)
- GitHub Actions CI (`test` + `build`) — Run erfolgreich
