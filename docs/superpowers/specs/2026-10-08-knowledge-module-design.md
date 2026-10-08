# Knowledge Module (Epic A) — Design Spec

**Status:** Approved for implementation planning  
**Date:** 2026-10-08  
**Product:** ProMan (local-first vault)

## Goal

Kunden- und projektgebundenes Wissen (Design, Strategie, Logik) anlegen, speichern und anzeigen — getrennt von freien Arbeits-Docs. Grundlage für spätere Epics Anforderungen (B) und Screen-Fragen (C).

## Decisions (locked)

| Thema | Wahl |
|---|---|
| Priorität Epics | A → B → C → D |
| Modulgrenze | **A2:** neues Modul „Wissen/Knowledge“ neben Docs |
| Inhaltsmodell | **K3:** feste Kategorien + Markdown-Vorlagen (Abschnitte), danach frei editierbar |
| Kunde vs. Projekt | **B3:** getrennte Speicherung; Projekt-Ansicht zeigt Kunden-Einträge read-only mit |
| Kategorien v1 | **C3:** Design-Kern + Mission/Vision + Logik + Sonstiges |
| Kardinalität | **N2:** mehrere Einträge pro Kategorie und Ebene |
| UI-Einstieg | **U3:** Sidebar-Hauptansicht + Abschnitt auf Kunden-/Projektseite |
| Architektur | **Ansatz 2:** eigene Entität `KnowledgeItem` + Vault-Ordner `knowledge/` |

## Non-goals (Epic A)

- Anforderungen (Epic B)
- Screen-Fragen / Figma-Workflow (Epic C)
- Gemeinsames Link-Modell härten (Epic D, falls nötig)
- Asset-Entität, Datei-Uploads, Figma-Embeds
- CRDT / Multi-Device-Sync
- Vererbungs-Schreiben (Projekt überschreibt Kunde automatisch)

## Data model

```ts
type KnowledgeCategory =
  | "colors"
  | "typography"
  | "design-system"
  | "blocks-sections"
  | "screens-views"
  | "mission-vision"
  | "logic"
  | "other";

interface KnowledgeItem {
  id: string;              // e.g. "KN-101"
  clientId: string;        // required
  projectId?: string;      // omitted / undefined = client scope
  category: KnowledgeCategory;
  title: string;
  content: string;         // markdown body
  tags: string[];
  createdAt: string;
  updatedAt: string;
}
```

### Vault layout

- Path: `knowledge/KN-101.md`
- Format: YAML frontmatter + markdown body (Obsidian-compatible), parallel to `docs/`
- Missing/empty `projectId` in frontmatter ⇒ client-level item
- Unknown `category` on load ⇒ coerce to `"other"` (no crash)

### Templates (K3)

On create, `content` is seeded from a per-category section skeleton (e.g. colors: Palette, Usage, Do/Don’t). No rigid field schema; body remains free markdown after creation.

## Display merge (B3)

Storage stays unmerged.

In a **project** context, the UI lists:

1. Project-scoped items (`projectId` matches) — editable
2. Client-scoped items (same `clientId`, no `projectId`) — **read-only**, badge „Kunde“ / „Client“

In a **client-only** context (no project selected): only client-scoped items; editable.

Store helper (conceptual): `getKnowledgeForProjectView(clientId, projectId)` returns items with a `readOnly` flag for UI; persist path rejects saves for read-only client items when viewing a project.

## UI

### Sidebar

- New nav item „Wissen“ / „Knowledge“ beside Docs
- Respects current client/project filter like Board/Docs
- Sets `currentView = "knowledge"`

### Knowledge view

- Left: categories as groups; entries under each (title)
- Inherited (B3) entries show a client badge; selecting them opens read-only editor
- Right: `MarkdownLiveField` (auto-save, same interaction model as Docs)
- Read-only: no save; hint + affordance to switch to client scope / edit there
- „+ Eintrag“: pick category → title → seed template → scope = current context

### Client / project page

- Section „Wissen“: short list grouped by category + „Alle öffnen“ → knowledge view
- Same underlying store data

### Empty states

- No client selected: prompt to choose context
- Category with no entries: short empty + create CTA

### Docs

Unchanged — free working notes only.

## Data flow & integration

```
Knowledge view / client section
  → AppStore (Map, selectedKnowledgeId, getters/CRUD)
  → knowledge-serializer
  → VaultStorage knowledge/ (or localStorage fallback)
```

### Store / FS

- Extend `ViewMode` with `"knowledge"`
- CRUD mirrored after Docs: load on vault connect, save/delete with Team-Vault stale guards
- Include `knowledge/` in vault fingerprint / stale path listing (same class as `docs/`)
- Demo seed: sample knowledge items
- Client delete: remove related knowledge items (same policy as docs)

### Command palette

- Search group for knowledge (title + category); recents analogous to docs

### i18n

- de/en for nav, categories, template headings, empty states, read-only hint

## Error handling

| Case | Behavior |
|---|---|
| No vault / permission denied | Same UX as Docs (toast + fallback) |
| Save on read-only B3 item | UI blocks; store rejects |
| Orphaned client/project refs | Skip/warn on load per existing docs practice; delete with client |
| Empty title | Allowed; display „Ohne Titel“ / „Untitled“ |

## Testing (minimum)

- Serializer roundtrip including optional `projectId`
- Store filter + B3 merge / read-only marking
- UX contract: nav, create-with-template, read-only hint in project context
- i18n integrity for new keys

## Later epics (context only)

| Epic | Intent |
|---|---|
| **B** | Requirements on projects (later assets) |
| **C** | Screen Q&A tied to Figma screens |
| **D** | Harden shared reference/link model across A–C if needed |

Knowledge IDs and `knowledge/` paths from A are the intended anchors for B/C links.

## Implementation notes

- Follow existing Docs patterns (`doc-serializer`, `docs-view`, `VaultStorage.loadAllDocs/saveDoc`) rather than inventing a second persistence style.
- Prefer small focused files: `types/knowledge.ts`, `storage/knowledge-serializer.ts`, `views/knowledge-view.ts`, templates module for category skeletons.
- Update living docs when shipping: `CHANGELOG.md`, `README.md`, `docs/ROADMAP.md` (A as next/done as appropriate).
