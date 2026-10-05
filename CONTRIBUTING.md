# Contributing to ProMan

## Run locally

```bash
npm install
npm run dev      # http://127.0.0.1:5173
npm test         # Vitest (Technik, Design, UX, A11y)
npm run test:coverage
npm run build    # tsc + vite build
```

Chrome/Edge recommended for the File System Access API (vault).

## Living documentation

Docs are **living files** and must match `main`:

| File | Update when… |
|---|---|
| `README.md` | Features, architecture, scripts, high-level contracts change |
| `docs/DESIGN.md` | Tokens, elevation, typography, component visual contracts change |
| `CHANGELOG.md` | User-facing changes |
| `SECURITY.md` | Threat model / permissions change |

PR checklist: code + tests + docs in the same change when behaviour or design contracts move.

## Project structure

```
src/
  components/   # Dialog, cards, sidebar, palette, toast, custom-select
  views/        # Kanban, list, gantt, calendar, docs, backoffice
  storage/      # Vault FS API, serializers, AppStore
  types/        # Task, Client, Doc, Member
  styles/       # fonts.css, tokens.css, component CSS (no Tailwind)
  design/ ux/ a11y/ test/  # integrity & accessibility tests
  i18n/         # de / en strings
docs/           # Living design & product docs
public/fonts/   # Self-hosted Geist variable woff2
vault-example/  # Sample Obsidian-style vault
```

## Vault layout

```
mein-vault/
  clients.json          # clients, projects, members
  tasks/<ISSUE-KEY>.md  # YAML frontmatter + markdown body
  docs/DOC-*.md
  attachments/          # optional binary attachments
```

Connect via sidebar **Vault verbinden**. Without a vault, data lives in `localStorage`.

## Conventions

- Vanilla TypeScript + Vite; keep UI borderless and token-driven (`docs/DESIGN.md`).
- Floating UI uses `--color-bg-elevated` + popover/overlay shadows — never blend with board surfaces.
- No native `<select>` in product UI; use `CustomSelect` (portaled / popover top-layer).
- Persist tasks/docs as Markdown; extend serializers when adding fields.
- Prefer small, focused PRs; update living docs + `CHANGELOG.md` for user-facing changes.
- New issue keys follow client/project codes; re-key drafts when client/project changes.
