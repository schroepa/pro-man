# Landing + Docs (AIDA / Tutorials) — Design Spec

**Status:** Approved for implementation  
**Date:** 2026-10-08  
**Product:** ProMan (local-first vault)

## Goal

Neue User über eine AIDA-Landing willkommen heißen und das Produkt erklären; handlungsfähige Tutorials unter `/docs` bereitstellen. Marketing und App bleiben eine Deploy-Unit.

## Decisions (locked)

| Thema | Wahl |
|---|---|
| Hosting | Gleicher Vite-Deploy; Multi-Page |
| App-URL | SPA unter `/app/` |
| Audience | Landing breit (Solo/Agentur); Docs tiefer (tech-affin) |
| Content | Landing handcrafted HTML; Tutorials Markdown → HTML |
| i18n | DE + EN von Anfang an via URL-Präfixe |
| Docs-Tooling | Kein VitePress; schlanke Build-Pipeline |
| Returning users | Kein Auto-Skip Landing → App im MVP |

## Non-goals (MVP)

- Blog, Pricing, Accounts
- In-App Help-View parallel zu `/docs`
- Volltext-Suche in Docs
- Auto-Redirect Returning Users zur App
- VitePress / zweites Framework

## URL IA

| URL | Rolle |
|---|---|
| `/` | Locale-Redirect (`Accept-Language` + `localStorage` `proman_locale`), Fallback `de` |
| `/de/`, `/en/` | AIDA-Landing |
| `/de/docs/`, `/en/docs/` | Docs-Hub |
| `/de/docs/<slug>/`, `/en/docs/<slug>/` | Tutorials |
| `/app/` | Bestehende SPA (Onboarding-Banner unverändert) |

Marketing-Nav: Logo · Docs · Sprache (DE/EN) · Primary-CTA „App öffnen“ → `/app/`.

## Landing

> **Aktualisiert:** Conversion-Landing — siehe [`2026-10-08-conversion-landing-design.md`](./2026-10-08-conversion-landing-design.md).

Kurz: Unified Narrative (Solo + kleines Team), schlanker SaaS-Vergleich, Product-Mocks, Dual-CTAs App + Docs. Visuell: Brand/Tokens (Geist, Copper, Warm Obsidian); Marketing darf Atmosphere nutzen. App bleibt werkzeugartig.

## Docs / Tutorials (MVP)

Authoring: `content/docs/{de,en}/*.md` mit Frontmatter `title`, `description`, `order`, `slug`.

1. Erste Schritte — Demo vs. Ordner, Dashboard  
2. Vault & Markdown — Struktur, Obsidian-kompatibel  
3. Alltag: Aufgaben & Views — Kanban/Liste/Gantt/Kalender, ⌘K  
4. Team auf einem Share — Verdichtung aus `docs/TEAM-VAULT.md`

Layout: Sidebar (Tutorial-Liste) + Artikel; Prev/Next; CTA „App öffnen“. Repo-`docs/` bleibt Entwickler-Doku.

## Architecture

```
index.html                 → Redirect-Stub
app/index.html             → SPA
de|en/index.html           → Landing (URLs /de/, /en/)
site/shared/               → Nav/Footer/Styles
content/docs/{de,en}/      → Tutorial-MD
scripts/build-docs.ts      → MD → {locale}/docs/
vite.config.ts             → Multi-Page Inputs
```

- PWA: `manifest` `start_url` + `scope` = `/app/`; SW-Register mit `scope: "/app/"`
- SEO/OG pro Locale-Landing und Docs-Seiten
- Tests: MPA-Build-Smoke, Docs-Frontmatter/Slug-Check, bestehende Integritätstests auf `app/index.html` umbiegen

## Success criteria

- `/` leitet nach `/de/` oder `/en/`
- Landing DE/EN folgen AIDA und verlinken `/app/` + Docs
- Vier Tutorials je Locale erreichbar und aus Markdown gebaut
- App unter `/app/` unverändert nutzbar; Onboarding bleibt
- `npm test` und `npm run build` grün
