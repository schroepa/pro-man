# Conversion Landing — Design Spec

**Status:** Approved for implementation  
**Date:** 2026-10-08  
**Product:** ProMan (local-first vault)  
**Supersedes (landing content):** Landing-Abschnitt in `2026-10-08-landing-docs-design.md` (URLs/Docs/PWA bleiben gültig)

## Goal

Neue Nutzer in der Zielgruppe (Solo + kleines Studio/Agentur) überzeugen und zur Conversion führen: **App öffnen** und **Tutorials** gleichgewichtet. Local-First/Privacy ist Trust-Unterton, nicht die Hauptstory.

## Decisions (locked)

| Thema | Wahl |
|---|---|
| Persona | Solo-Freelancer + kleines Team (2–8); Privacy-Maker nicht ausgeschlossen |
| Conversion | Dual-Path: App (Primary-Look) + Docs (Secondary, gleich sichtbar) |
| Narrative | Unified (keine Persona-Tabs) + schlanker SaaS-Vergleich |
| Visual | Warm Obsidian + Copper; CSS Product-Mocks; Atmosphere erlaubt |
| i18n | DE + EN, manuell gespiegelte HTML-Dateien |

## Non-goals

- Pricing, Accounts, Blog, Waitlist, Analytics/A-B
- Persona-Tabs, schwere Feature-Matrix, echte PNG-Screenshots
- Auto-Redirect Returning Users zur App
- VitePress / zweites Framework

## Section flow

1. **Hero** — Brand dominant, Outcome-Headline, Lead, Dual-CTA (App + Tutorials), Chrome-Hinweis; ein Product-Frame (Kanban-Mock); Breathing-Dots (Hex-Grid, radiale Rounded-Square-Welle, Maus = Ursprung, ≤4px, Auslaufen unten; keine Linien; leiser als Codrops-Demo; `prefers-reduced-motion` → statisch)
2. **Problem** (`#interest`) — Tool-Chaos → ein lokaler Workspace; 3 Punkte
3. **Vergleich** (`#compare`) — 4 Kontrastzeilen vs. typisches SaaS (Account, Datenhoheit, Ordner, Team ohne Sync-Server)
4. **Tour** (`#tour`) — 3 Szenen mit CSS-UI-Mocks (Board, Vault, Team-Share)
5. **Einstieg** (`#start`) — 3 Schritte + Link zu Tutorials
6. **Trust** — Kein Account, keine Telemetrie, Markdown/Obsidian/Git, Chrome/Edge
7. **Close** — Dual-CTA App + Docs

Nav: Logo · Docs · DE/EN · Primary „App öffnen“.

## Success criteria

- `/de/` und `/en/` folgen dem Fluss oben; Dual-CTAs in Hero und Close
- Integrity-Tests decken Hero, `#interest`, `#compare`, App- und Docs-Links ab
- Brand-Header nutzt vorhandene/shippende Assets; OG-Referenz auflösbar
- `npm test` und `npm run build` grün
- Docs-Shell und `/app/` unverändert in ihrer Rolle
