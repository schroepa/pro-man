# Knowledge Module (Epic A) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a local-first Knowledge module (`knowledge/*.md`) for client- and project-scoped design/strategy docs, separate from free-form Docs, with B3 display-merge and category templates.

**Architecture:** Mirror the Docs pipeline: `KnowledgeItem` type → `knowledge-serializer` → `VaultStorage` folder `knowledge/` → `AppStore` CRUD + B3 merge helper → `knowledge-view` + client-page section + sidebar/⌘K wiring. Docs stay unchanged.

**Tech Stack:** Vanilla TypeScript, Vite, Vitest (happy-dom/node), existing MarkdownLiveField, Obsidian-style YAML frontmatter Markdown, File System Access API vault.

**Spec:** `docs/superpowers/specs/2026-10-08-knowledge-module-design.md`

## Global Constraints

- Local-first only; no backend, no Figma embeds, no asset uploads in Epic A
- Docs (`DocItem` / `docs/`) remain free working notes — do not merge Knowledge into Docs
- Vault files: `knowledge/KN-*.md`, Obsidian-compatible frontmatter + body
- Categories locked to: `colors` | `typography` | `design-system` | `blocks-sections` | `screens-views` | `mission-vision` | `logic` | `other`
- Multiple entries per category per scope (N2); `projectId` optional (client scope when absent)
- B3: project view lists project items (editable) + client items (read-only badge); storage unmerged
- Follow existing Docs patterns for stale-guard, atomic write, undo commands, localStorage fallback
- Living docs on ship: `CHANGELOG.md`, `README.md`, `docs/ROADMAP.md`
- UI copy de/en via `src/i18n/index.ts`; i18n integrity test must stay green
- Commit messages: short German “why”, HEREDOC; no `--no-verify`

---

## File map

| File | Responsibility |
|---|---|
| `src/types/knowledge.ts` | `KnowledgeCategory`, `KnowledgeItem`, `KnowledgeListEntry` |
| `src/storage/knowledge-templates.ts` | Category → markdown skeleton (locale-aware via i18n keys or de default + en override) |
| `src/storage/knowledge-serializer.ts` | `knowledgeToMarkdown` / `markdownToKnowledge` |
| `src/storage/knowledge-serializer.test.ts` | Roundtrip + optional projectId + unknown category |
| `src/storage/file-system.ts` | `knowledge/` dir, load/save/delete, fingerprint, fallback LS |
| `src/storage/store.ts` | Map, ViewMode, CRUD, B3 helper, seed, client/project cascade |
| `src/storage/knowledge.store.test.ts` | Filter, B3 merge, read-only save reject |
| `src/views/knowledge-view.ts` | Hub UI (list by category + editor) |
| `src/styles/components/knowledge.css` | Layout (reuse docs patterns; knowledge-specific badges) |
| `src/main.ts` | Lazy route `knowledge` |
| `src/components/sidebar.ts` | Nav item |
| `src/components/mobile-bottom-nav.ts` | Treat knowledge like docs under “more” or dedicated if space |
| `src/views/client-view.ts` | Knowledge section + open CTA |
| `src/components/command-palette.ts` | Search group + new action |
| `src/storage/command-recents.ts` | `kind: "knowledge"` |
| `src/i18n/index.ts` | All user-facing strings |
| `src/ux/knowledge.ux.test.ts` | Source-contract UX tests |
| `vault-example/knowledge/*.md` | Sample entries |
| `README.md`, `CHANGELOG.md`, `docs/ROADMAP.md` | Living docs |

---

### Task 1: Types + category templates

**Files:**
- Create: `src/types/knowledge.ts`
- Create: `src/storage/knowledge-templates.ts`
- Create: `src/storage/knowledge-templates.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces:
  - `export type KnowledgeCategory = "colors" | "typography" | "design-system" | "blocks-sections" | "screens-views" | "mission-vision" | "logic" | "other"`
  - `export const KNOWLEDGE_CATEGORIES: readonly KnowledgeCategory[]`
  - `export interface KnowledgeItem { id; clientId; projectId?: string; category; title; content; tags; createdAt; updatedAt }`
  - `export interface KnowledgeListEntry { item: KnowledgeItem; readOnly: boolean }`
  - `export function isKnowledgeCategory(value: string): value is KnowledgeCategory`
  - `export function knowledgeTemplate(category: KnowledgeCategory, locale: "de" | "en"): string`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { KNOWLEDGE_CATEGORIES, isKnowledgeCategory } from "../types/knowledge";
import { knowledgeTemplate } from "./knowledge-templates";

describe("knowledge categories", () => {
  it("lists eight locked categories", () => {
    expect(KNOWLEDGE_CATEGORIES).toHaveLength(8);
    expect(isKnowledgeCategory("colors")).toBe(true);
    expect(isKnowledgeCategory("nope")).toBe(false);
  });
});

describe("knowledgeTemplate", () => {
  it("seeds markdown headings for colors (de)", () => {
    const md = knowledgeTemplate("colors", "de");
    expect(md).toContain("## Palette");
    expect(md).toContain("## Verwendung");
    expect(md).toContain("## Do / Don’t");
  });

  it("seeds english headings for mission-vision", () => {
    const md = knowledgeTemplate("mission-vision", "en");
    expect(md).toMatch(/## Mission/i);
    expect(md).toMatch(/## Vision/i);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/storage/knowledge-templates.test.ts`

Expected: FAIL (modules missing)

- [ ] **Step 3: Implement types + templates**

`src/types/knowledge.ts` — exact shapes from Spec § Data model, plus `KnowledgeListEntry` and `KNOWLEDGE_CATEGORIES` / `isKnowledgeCategory`.

`src/storage/knowledge-templates.ts` — for each category return a short markdown skeleton (2–4 `##` sections). Keep copy inline in this module (de/en maps) so Task 1 does not depend on i18n yet; later UI may still show i18n category labels separately.

Minimum section sets:
- `colors`: Palette, Verwendung/Usage, Do / Don’t
- `typography`: Fonts, Hierarchy, Usage
- `design-system`: Principles, Components, Tokens
- `blocks-sections`: Patterns, Variants, Notes
- `screens-views`: Overview, Flows, Notes
- `mission-vision`: Mission, Vision, Principles
- `logic`: Rules, Edge cases, Notes
- `other`: Summary, Details

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/storage/knowledge-templates.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/types/knowledge.ts src/storage/knowledge-templates.ts src/storage/knowledge-templates.test.ts
git commit -m "$(cat <<'EOF'
Knowledge-Typen und Kategorie-Vorlagen als Fundament für Epic A.

EOF
)"
```

---

### Task 2: Knowledge serializer (TDD)

**Files:**
- Create: `src/storage/knowledge-serializer.ts`
- Create: `src/storage/knowledge-serializer.test.ts`

**Interfaces:**
- Consumes: `KnowledgeItem`, `isKnowledgeCategory` from Task 1
- Produces:
  - `export function knowledgeToMarkdown(item: KnowledgeItem): string`
  - `export function markdownToKnowledge(raw: string, fallbackId: string): KnowledgeItem`

Frontmatter keys: `id`, `type: knowledge`, `clientId`, `projectId` (omit line when undefined/empty), `category`, `title` (JSON.stringify), `createdAt`, `updatedAt`, `tags` (YAML list or `[]`). Body = `content`.

On parse: empty `projectId` → `undefined`; unknown category → `"other"`.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { knowledgeToMarkdown, markdownToKnowledge } from "./knowledge-serializer";
import type { KnowledgeItem } from "../types/knowledge";

function sample(overrides: Partial<KnowledgeItem> = {}): KnowledgeItem {
  return {
    id: "KN-100",
    clientId: "cli-acme",
    projectId: "prj-web",
    category: "colors",
    title: "Brand Colors",
    content: "# Brand Colors\n\n## Palette\n- Primary",
    tags: ["design"],
    createdAt: "2026-10-01T10:00:00.000Z",
    updatedAt: "2026-10-05T12:00:00.000Z",
    ...overrides,
  };
}

describe("knowledge-serializer", () => {
  it("round-trips core fields", () => {
    const original = sample();
    const parsed = markdownToKnowledge(knowledgeToMarkdown(original), "FALLBACK");
    expect(parsed.id).toBe(original.id);
    expect(parsed.clientId).toBe(original.clientId);
    expect(parsed.projectId).toBe(original.projectId);
    expect(parsed.category).toBe("colors");
    expect(parsed.title).toBe(original.title);
    expect(parsed.tags).toEqual(["design"]);
    expect(parsed.content).toContain("## Palette");
  });

  it("omits projectId for client-scoped items", () => {
    const md = knowledgeToMarkdown(sample({ projectId: undefined }));
    expect(md).not.toMatch(/^projectId:/m);
    const parsed = markdownToKnowledge(md, "FALLBACK");
    expect(parsed.projectId).toBeUndefined();
  });

  it("coerces unknown category to other", () => {
    const md = `---
id: KN-1
type: knowledge
clientId: cli-acme
category: not-a-real-category
title: "X"
createdAt: 2026-10-01T10:00:00.000Z
updatedAt: 2026-10-01T10:00:00.000Z
tags: []
---

Body`;
    expect(markdownToKnowledge(md, "KN-1").category).toBe("other");
  });

  it("falls back when frontmatter missing", () => {
    const parsed = markdownToKnowledge("# Just body", "KN-FALLBACK");
    expect(parsed.id).toBe("KN-FALLBACK");
    expect(parsed.content).toContain("Just body");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/storage/knowledge-serializer.test.ts`

Expected: FAIL

- [ ] **Step 3: Implement serializer**

Mirror `doc-serializer.ts` parsing loop; set `type: knowledge`; use `isKnowledgeCategory` for coerce; only write `projectId` when truthy.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/storage/knowledge-serializer.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/storage/knowledge-serializer.ts src/storage/knowledge-serializer.test.ts
git commit -m "$(cat <<'EOF'
Knowledge-Markdown Roundtrip inkl. optionalem projectId.

EOF
)"
```

---

### Task 3: VaultStorage knowledge I/O + fingerprint

**Files:**
- Modify: `src/storage/file-system.ts` (add `KNOWLEDGE_DIR`, helpers, load/save/delete, fingerprint stamping, fallback LS keys)
- Test: extend existing vault tests or add `src/storage/knowledge-fs.test.ts` for pure helpers if any; at minimum verify `ensureVaultStructure` creates `knowledge/` via a focused unit if testable — otherwise add a source-contract assertion in Task 10. Prefer adding fallback roundtrip test that does not need FS Access API:

**Interfaces:**
- Consumes: serializer from Task 2
- Produces on `VaultStorage`:
  - `loadAllKnowledge(): Promise<KnowledgeItem[]>`
  - `saveKnowledge(item: KnowledgeItem): Promise<void>`
  - `deleteKnowledge(id: string): Promise<void>`
  - Fingerprint includes `knowledge/<file>.md` paths like docs
  - Fallback: `localStorage` key `pro_man_fallback_knowledge`

Mirror docs methods (`getDocsDir` → `getKnowledgeDir`, `isDocFileName` → `isKnowledgeFileName` accepting `KN-*.md` or any `.md` in folder).

- [ ] **Step 1: Write the failing test (fallback roundtrip)**

In `src/storage/knowledge-fs.test.ts` (happy-dom):

```ts
/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, beforeEach } from "vitest";
import { VaultStorage } from "./file-system";
import type { KnowledgeItem } from "../types/knowledge";

describe("VaultStorage knowledge fallback", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("saves and loads knowledge without a vault handle", async () => {
    const storage = new VaultStorage();
    const item: KnowledgeItem = {
      id: "KN-1",
      clientId: "cli-acme",
      category: "logic",
      title: "Rules",
      content: "## Rules\n- A",
      tags: [],
      createdAt: "2026-10-01T10:00:00.000Z",
      updatedAt: "2026-10-01T10:00:00.000Z",
    };
    await storage.saveKnowledge(item);
    const all = await storage.loadAllKnowledge();
    expect(all).toHaveLength(1);
    expect(all[0].title).toBe("Rules");
    await storage.deleteKnowledge("KN-1");
    expect(await storage.loadAllKnowledge()).toHaveLength(0);
  });
});
```

If `VaultStorage` constructor/export name differs, match `file-system.ts` export (read file; use the same class/instance pattern docs tests would use — if none exist, instantiate as used in `store.ts`).

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/storage/knowledge-fs.test.ts`

Expected: FAIL (`saveKnowledge` missing)

- [ ] **Step 3: Implement FS methods**

In `file-system.ts`:
1. `const KNOWLEDGE_DIR = "knowledge"`
2. `ensureVaultStructure`: also `getDirectoryHandle(KNOWLEDGE_DIR, { create: true })`
3. `getKnowledgeDir(create)`
4. `loadAllKnowledge` / `saveKnowledge` / `deleteKnowledge` parallel to docs
5. In fingerprint builder (where docs are stamped ~line 808): also stamp `knowledge/` files as `knowledge/${name}`
6. Fallback helpers mirroring `loadFallbackDocs` / `saveFallbackDoc` / `deleteFallbackDoc`

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/storage/knowledge-fs.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/storage/file-system.ts src/storage/knowledge-fs.test.ts
git commit -m "$(cat <<'EOF'
Vault knowledge/-Ordner inkl. Fallback und Fingerprint.

EOF
)"
```

---

### Task 4: AppStore knowledge CRUD + B3 merge

**Files:**
- Modify: `src/storage/store.ts`
- Modify: `src/test/helpers.ts` (`knowledge` map clear in `resetStoreMaps` / `storeInternals`)
- Create: `src/storage/knowledge.store.test.ts`

**Interfaces:**
- Consumes: `KnowledgeItem`, `KnowledgeListEntry`, vault methods from Task 3
- Produces on store:
  - `ViewMode` includes `"knowledge"`
  - `selectedKnowledgeId: string | null`
  - `private knowledge: Map<string, KnowledgeItem>`
  - `getKnowledge(clientId?: string | null, projectId?: string | null): KnowledgeItem[]`
    - If `projectId` set: return only items with that `projectId` (exact), filtered by client if given
    - If only `clientId`: return client-scoped items (`!projectId`) for that client
    - If neither: all items (optional search via existing `searchQuery` on title/content)
  - `getKnowledgeForProjectView(clientId: string, projectId: string): KnowledgeListEntry[]`
    - Project items `readOnly: false` + client-scoped same client `readOnly: true`, sorted by category then title
  - `getKnowledgeItem(id: string): KnowledgeItem | undefined`
  - `async saveKnowledge(item: KnowledgeItem): Promise<void>` — same command/undo/stale pattern as `saveDoc`; **reject** (no-op + no write) if caller tries to save a client-scoped item while `selectedProjectId` is set and item has no `projectId` (B3). Simpler rule: `saveKnowledge` always persists the item as given; **UI** must not call save for read-only. Additionally export `canEditKnowledge(item): boolean` → `!(store.selectedProjectId && !item.projectId)`.
  - `async deleteKnowledge(id: string): Promise<void>`
  - Load knowledge alongside docs in vault connect / reload paths
  - `initDefaultKnowledge()` sample entries (at least one client-scoped colors + one project-scoped screens-views for Acme)
  - Client delete / project delete: cascade delete linked knowledge (mirror docs)

- [ ] **Step 1: Write the failing test**

```ts
/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, beforeEach } from "vitest";
import { store } from "./store";
import { resetStoreMaps, seedClientProject, storeInternals, stubVaultWrites } from "../test/helpers";
import type { KnowledgeItem } from "../types/knowledge";

function kn(partial: Partial<KnowledgeItem> & Pick<KnowledgeItem, "id" | "category" | "title">): KnowledgeItem {
  return {
    clientId: "cli-acme",
    content: "",
    tags: [],
    createdAt: "2026-10-01T10:00:00.000Z",
    updatedAt: "2026-10-01T10:00:00.000Z",
    ...partial,
  };
}

describe("knowledge store B3", () => {
  beforeEach(() => {
    resetStoreMaps();
    stubVaultWrites();
    seedClientProject();
    store.selectedClientId = "cli-acme";
    store.selectedProjectId = "prj-web";
  });

  it("merges client items as read-only in project view", () => {
    const s = storeInternals() as any;
    s.knowledge.set("KN-c", kn({ id: "KN-c", category: "colors", title: "Client colors" }));
    s.knowledge.set("KN-p", kn({ id: "KN-p", category: "colors", title: "Project colors", projectId: "prj-web" }));
    const list = store.getKnowledgeForProjectView("cli-acme", "prj-web");
    expect(list).toHaveLength(2);
    expect(list.find(e => e.item.id === "KN-c")?.readOnly).toBe(true);
    expect(list.find(e => e.item.id === "KN-p")?.readOnly).toBe(false);
  });

  it("canEditKnowledge is false for client items when project selected", () => {
    const item = kn({ id: "KN-c", category: "logic", title: "L" });
    expect(store.canEditKnowledge(item)).toBe(false);
    store.selectedProjectId = null;
    expect(store.canEditKnowledge(item)).toBe(true);
  });
});
```

Extend `stubVaultWrites` in helpers to no-op `saveKnowledge` / `deleteKnowledge` / `loadAllKnowledge` if needed.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/storage/knowledge.store.test.ts`

Expected: FAIL

- [ ] **Step 3: Implement store + helpers**

Wire load in the same places `loadAllDocs` runs (vault connect + reload). Seed defaults when empty (respect demo-clear flag like docs). Update `resetStoreMaps` to `s.knowledge?.clear()`.

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/storage/knowledge.store.test.ts src/storage/store.behavior.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/storage/store.ts src/test/helpers.ts src/storage/knowledge.store.test.ts
git commit -m "$(cat <<'EOF'
Store-CRUD und B3-Merge für Knowledge-Einträge.

EOF
)"
```

---

### Task 5: i18n strings (de/en)

**Files:**
- Modify: `src/i18n/index.ts`
- Rely on existing: `src/i18n/i18n.integrity.test.ts`

**Interfaces:**
- Consumes: nothing new
- Produces keys (both locales, identical tree):

```ts
views.knowledge: "Wissen" / "Knowledge"
nav.knowledgeShort: "Wissen" / "Knowledge"  // if nav section exists; else put under views only
actions.newKnowledge: "Neuer Wissenseintrag" / "New knowledge entry"
knowledge: {
  title: ...,
  contentPlaceholder: ...,
  contentMarkdownHint: ..., // can reuse docs wording pattern
  noItems: ...,
  noClientContext: "Wähle einen Kunden, um Wissen anzulegen.",
  selectToView: ...,
  searchPlaceholder: ...,
  untitled: ...,
  clientBadge: "Kunde" / "Client",
  readOnlyHint: "Kunden-Wissen — im Projekt nur lesbar. Zum Bearbeiten Kunden-Kontext wählen.",
  editAtClient: "Im Kunden-Kontext bearbeiten",
  openAll: "Alle öffnen",
  sectionTitle: "Wissen",
  categories: {
    colors, typography, designSystem, blocksSections, screensViews, missionVision, logic, other
  },
  createCategoryPrompt: "Kategorie",
  seededToast: optional omit
}
command.groupKnowledge: "Wissen" / "Knowledge"
shortcuts.viewKnowledge: ...
```

Map category enum → `t().knowledge.categories.*` in the view (camelCase keys).

- [ ] **Step 1: Add keys to `translations.de` and `translations.en`**

- [ ] **Step 2: Run integrity test**

Run: `npx vitest run src/i18n/i18n.integrity.test.ts`

Expected: PASS (same key tree)

- [ ] **Step 3: Commit**

```bash
git add src/i18n/index.ts
git commit -m "$(cat <<'EOF'
i18n-Strings für Wissensmodul (de/en).

EOF
)"
```

---

### Task 6: Knowledge view + CSS

**Files:**
- Create: `src/views/knowledge-view.ts`
- Create: `src/styles/components/knowledge.css`
- Modify: main styles entry that imports `docs.css` (find via grep `docs.css` in `src/styles`) to also import `knowledge.css`

**Interfaces:**
- Consumes: store methods from Task 4, templates Task 1, i18n Task 5, `MarkdownLiveField`, `CustomSelect` (category on create)
- Produces: `export function renderKnowledgeView(container: HTMLElement): void`

Behavior:
1. If no `selectedClientId`: empty state `knowledge.noClientContext`
2. Else build list:
   - If `selectedProjectId`: `getKnowledgeForProjectView(client, project)`
   - Else: client-scoped via `getKnowledge(clientId)` mapped to `{ item, readOnly: false }`
3. Left sidebar: group by `category` using `KNOWLEDGE_CATEGORIES` order; show title + client badge when `readOnly`
4. Right: title input + `MarkdownLiveField` with class `md-live-field--knowledge`; if `!canEditKnowledge(active)` disable inputs and show `readOnlyHint` + button that clears `selectedProjectId`, keeps client, re-selects item, `notify`
5. Auto-save on blur/change like docs (read docs-view save path and mirror)
6. `+` button: create `KN-${random}`, category default `other` or prompt via `CustomSelect`, title untitled, `content: knowledgeTemplate(category, currentLocale)`, set `projectId` only if project selected
7. Wikilinks: bind like docs if cheap; otherwise skip (YAGNI) — prefer bind if docs helper is reusable

- [ ] **Step 1: Implement view + CSS** (reuse docs layout class names where possible: e.g. wrap with `docs-hub-container knowledge-hub` to inherit grid; add `.knowledge-client-badge`)

- [ ] **Step 2: Manual smoke not required in CI yet — write UX source contract in Task 8**

- [ ] **Step 3: Commit**

```bash
git add src/views/knowledge-view.ts src/styles/components/knowledge.css src/styles/**/*.css
git commit -m "$(cat <<'EOF'
Wissens-Ansicht mit Kategorie-Gruppen und Read-only-Hinweis.

EOF
)"
```

---

### Task 7: Wire routing, sidebar, mobile

**Files:**
- Modify: `src/main.ts` — lazy import `renderKnowledgeView` when `view === "knowledge"`; optional shortcut if docs has one
- Modify: `src/components/sidebar.ts` — nav button `data-nav="knowledge"` next to docs
- Modify: `src/components/mobile-bottom-nav.ts` — include `knowledge` in `moreActive` set (with backoffice/calendar/gantt) so “Mehr” highlights when on knowledge; do not replace docs tab
- Modify: `src/components/topbar.ts` only if view title map needs `knowledge`

- [ ] **Step 1: Wire all navigation entry points**

- [ ] **Step 2: Run unit suite smoke**

Run: `npx vitest run src/ux/mobile-app-shell.test.ts src/i18n/i18n.integrity.test.ts`

Expected: PASS (update mobile test expectations if they assert exact moreActive views)

- [ ] **Step 3: Commit**

```bash
git add src/main.ts src/components/sidebar.ts src/components/mobile-bottom-nav.ts src/components/topbar.ts
git commit -m "$(cat <<'EOF'
Wissen in Sidebar, Routing und Mobile-Mehr-Menü einhängen.

EOF
)"
```

---

### Task 8: Client page section + command palette + UX tests

**Files:**
- Modify: `src/views/client-view.ts` — section listing up to ~8 knowledge items for client (and if a project context exists on client page, still show client-scoped list per spec); CTA `openAll` → `currentView = "knowledge"`
- Modify: `src/components/command-palette.ts` — group `knowledge`, items from `store.getKnowledge()`, action new knowledge, view switch
- Modify: `src/storage/command-recents.ts` — allow `kind: "knowledge"`
- Create: `src/ux/knowledge.ux.test.ts`

**UX test content:**

```ts
/**
 * @vitest-environment node
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("Knowledge UX contracts", () => {
  it("knowledge view uses MarkdownLiveField and B3 read-only affordances", () => {
    const src = readFileSync(resolve(__dirname, "../views/knowledge-view.ts"), "utf8");
    expect(src).toContain("MarkdownLiveField");
    expect(src).toContain("canEditKnowledge");
    expect(src).toContain("knowledgeTemplate");
    expect(src).toContain("getKnowledgeForProjectView");
  });

  it("sidebar exposes knowledge nav", () => {
    const src = readFileSync(resolve(__dirname, "../components/sidebar.ts"), "utf8");
    expect(src).toContain('data-nav="knowledge"');
  });

  it("client view links to knowledge", () => {
    const src = readFileSync(resolve(__dirname, "../views/client-view.ts"), "utf8");
    expect(src).toContain("knowledge");
    expect(src).toMatch(/currentView\s*=\s*"knowledge"/);
  });
});
```

- [ ] **Step 1: Write UX test (expect fail)**

- [ ] **Step 2: Implement client section + palette + recents**

- [ ] **Step 3: Run**

Run: `npx vitest run src/ux/knowledge.ux.test.ts src/ux/command-palette.search.test.ts`

Expected: PASS (fix palette tests if group order assertions break)

- [ ] **Step 4: Commit**

```bash
git add src/views/client-view.ts src/components/command-palette.ts src/storage/command-recents.ts src/ux/knowledge.ux.test.ts
git commit -m "$(cat <<'EOF'
Wissen auf Kundenseite und in der Befehlspalette.

EOF
)"
```

---

### Task 9: Sample vault + living docs + full test pass

**Files:**
- Create: `vault-example/knowledge/KN-001.md` (client-scoped colors for Acme)
- Create: `vault-example/knowledge/KN-002.md` (project-scoped screens-views for web redesign)
- Modify: `CHANGELOG.md` (Unreleased)
- Modify: `README.md` (Features table + architecture tree + vault layout)
- Modify: `docs/ROADMAP.md` (Knowledge module under Jetzt or Done when shipped)

- [ ] **Step 1: Add vault-example files matching serializer output**

- [ ] **Step 2: Update living docs**

- [ ] **Step 3: Full test + build**

Run: `npm test && npm run build`

Expected: all green

- [ ] **Step 4: Commit**

```bash
git add vault-example/knowledge CHANGELOG.md README.md docs/ROADMAP.md
git commit -m "$(cat <<'EOF'
Wissensmodul dokumentieren und Beispiel-Vault ergänzen.

EOF
)"
```

- [ ] **Step 5: Push `main` only if tests green and user/workspace ship rule applies** — workspace rule allows push of completed verified work to `origin/main`; do so after Task 9 passes unless user said otherwise.

---

## Spec coverage checklist

| Spec requirement | Task |
|---|---|
| `KnowledgeItem` + categories C3 | 1 |
| K3 templates | 1, 6 |
| Serializer + optional projectId + unknown→other | 2 |
| Vault `knowledge/` + fingerprint + fallback | 3 |
| Store CRUD, seed, cascade delete | 4 |
| B3 merge + read-only | 4, 6 |
| ViewMode + sidebar + client section U3 | 6, 7, 8 |
| MarkdownLiveField editor | 6 |
| ⌘K group | 8 |
| i18n de/en | 5 |
| Tests serializer/store/UX | 2, 4, 8 |
| Living docs + example vault | 9 |
| Non-goals B/C/D | — explicitly omitted |

## Self-review notes

- No placeholders left; signatures named consistently (`saveKnowledge`, `getKnowledgeForProjectView`, `canEditKnowledge`).
- Mobile: Knowledge via sidebar/Mehr, not a fifth primary tab — matches space constraints without dropping U3 desktop entry.
- `getKnowledge` vs B3 helper split avoids breaking a single filter API.
