# ProMan Roadmap

> **Lebende Liste.** Wird bei Prioritätswechseln und abgeschlossenen Epics aktualisiert. Kein Commitment-Datum, sondern Reihenfolge nach Nutzen × Aufwand für den lokalen Kern.

Stand: nach v0.3.0 (CI grün auf `main`)

---

## Jetzt sinnvoll (nächste Iterationen)

Priorisiert nach Hebel für Stabilität und Alltagstauglichkeit:

| # | Thema | Warum |
|---|---|---|
| 1 | **Smoke-Pass & Release-Tag `v0.3.0`** | CI ist grün; manueller Vault-Durchlauf + Git-Tag macht den Stand referenzierbar |
| 2 | **Onboarding / Empty States** | Erster Vault-Connect und leere Boards klarer führen |
| 3 | **Mobile / schmale Viewports** | Sidebar, Filter-Popover, Dialog-Selects unter 768px härten |
| 4 | **Performance-Pass** | Lighthouse auf Cold-Load (Geist-Preload, Bundle, lange Listen) |
| 5 | **Vault-Robustheit** | Fehlerpfade bei Denied/Permission, Reload, fehlenden Codes |
| 6 | **Search-Qualität in ⌘K** | Fuzzy/Recent, klare Gruppen, Keyboard-only Flow |

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

- Warm Obsidian Elevation + CustomSelect Top-Layer
- Geist / Geist Mono self-hosted
- Issue-Key Re-Key bei Kunde/Projekt
- Test-Suite (Technik, Design, UX, A11y)
- Lebende Doku (`README`, `docs/DESIGN.md`)
- GitHub Actions CI (`test` + `build`) — Run erfolgreich
