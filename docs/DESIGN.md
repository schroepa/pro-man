# ProMan Design System

> **Lebende Spezifikation.** Diese Datei wird bei jeder relevanten Design-/Token-/UI-Änderung aktualisiert. Quelle der Wahrheit für Tokens: `src/styles/tokens.css`. Tests: `src/design/design-integrity.test.ts`.

Stand: **v0.3.1** (Warm Obsidian + Geist; Task-Drawer rechts)

---

## 1. Design-Prinzipien

1. **Local-First UI** — ruhig, werkzeugartig in der App; Marketing-Seiten (`/de/`, `/en/`) dürfen Atmosphere und Product-Mocks nutzen, bleiben aber auf denselben Tokens.
2. **Zero-Border (ruhende Flächen)** — Hierarchie über Surface-Stufen, Typo und Elevation; keine schweren Rahmen an Cards/Inputs im Ruhezustand.
3. **Figure/Ground** — Floating UI (Menus, Popovers, Dialoge) muss klar über dem Board liegen.
4. **Tintfield-kompatibel** — 12-stufige Skalen (`--neutral-*`, `--brand-*`) austauschbar.
5. **WCAG** — Primärtext zielt auf AAA-Kontrast; Focus sichtbar; Motion reduzierbar.
6. **Performance-Typografie** — self-hosted Variable Fonts, `font-display: swap`, Preload nur für Sans.

Anti-Patterns (bewusst vermeiden): lila Gradient-Themes, Glow-Stacks, überall `rounded-full` Pills, Inter-als-Default, native OS-Selects.

---

## 2. Farbarchitektur

### 2.1 Primitive Skalen (Light)

| Token | Hex | Rolle |
|---|---|---|
| `--neutral-1` | `#faf9f7` | Canvas |
| `--neutral-2` | `#f3f1ec` | Sidebar / Subtle |
| `--neutral-3` | `#eae7df` | Muted / Input-Rest-Nähe |
| `--neutral-4` | `#e0dcd2` | Hover |
| `--neutral-5` | `#d4cfc2` | Active / Selection |
| `--neutral-6` | `#c2bcad` | Controls |
| `--neutral-7` | `#948d7d` | Muted Text |
| `--neutral-8` | `#6e6757` | Secondary Text |
| `--neutral-9`…`12` | dunkler | Primary / Headings |

| Token | Hex | Rolle |
|---|---|---|
| `--brand-9` | `#c25e1a` | Primary CTA (Light) |
| `--brand-10` | `#aa4e11` | CTA Hover |
| `--brand-11` | `#823807` | Accent Text on Light |

Funktionale Skalen: `--success-*`, `--warning-*`, `--danger-*`, `--info-*` sowie Prioritäts-/Status-Tokens (`--priority-*`, `--status-*-bg/text/solid`).

### 2.2 Primitive Skalen (Dark) — Warm Obsidian

| Token | Hex | Rolle |
|---|---|---|
| `--neutral-1` | `#11100f` | Canvas |
| `--neutral-2` | `#181615` | Sidebar / Columns |
| `--neutral-3` | `#201e1c` | Card Surface |
| `--neutral-4` | `#292624` | Hover / Raised |
| `--neutral-5` | `#34312e` | **Elevated / Active** |
| `--neutral-11` | `#f5f5f4` | Primary Text |
| `--brand-9` | `#e07a38` | Luminous Copper CTA |

Dark aktiviert über:

- `prefers-color-scheme: dark` (wenn nicht `data-theme="light"`), oder
- `data-theme="dark"` am Root.

### 2.3 Semantische Surfaces

| Token | Light | Dark | Verwendung |
|---|---|---|---|
| `--color-bg-canvas` | neutral-1 | neutral-1 | App-Hintergrund |
| `--color-bg-sidebar` | neutral-2 | neutral-2 | Navigation |
| `--color-bg-surface` | `#ffffff` | neutral-3 | Cards, Panels |
| `--color-bg-surface-raised` | `#ffffff` | neutral-4 | Leicht angehoben |
| `--color-bg-subtle` | neutral-2 | neutral-2 | Inputs Rest, Chips |
| `--color-bg-muted` | neutral-3 | neutral-4 | Hover Controls |
| `--color-bg-elevated` | `#ffffff` | **neutral-5** | Menus, Popovers, Dialoge, Toasts |

**Regel Dark Mode:** Elevated Surfaces sind **heller** als Resting Surfaces (Atlassian/Material-Elevation).

### 2.4 Borders

| Token | Wert | Regel |
|---|---|---|
| `--color-border-subtle/default/strong` | `transparent` | Zero-Border Ruhe-UI |
| `--color-border-elevated` | mix(neutral-12, 10–12%) | Hairline nur für Floating UI (in Shadows eingebettet) |

### 2.5 Text

| Token | Light | Dark |
|---|---|---|
| `--color-text-primary` | neutral-12 | neutral-11 |
| `--color-text-secondary` | neutral-8 | neutral-8 |
| `--color-text-muted` | neutral-7 | neutral-7 |
| `--color-text-inverse` | white | neutral-1 |

Kontrastziel Primärtext auf Canvas: ≥ **7:1** (AAA), abgesichert in Design-Tests.

### 2.6 Overlay / Scrim

| Token | Rolle |
|---|---|
| `--overlay-ink` | warmes Dunkel (`#0c0b0a`) |
| `--color-overlay` | Dialog/Palette Scrim |
| `--color-overlay-strong` | Task-Dialog Backdrop |
| `--overlay-blur` | Backdrop-Filter |

---

## 3. Elevation & Shadows

| Token | Einsatz |
|---|---|
| `--shadow-sm` | Mikro-Elevation (Tabs, kleine Chips) |
| `--shadow-card` / `--shadow-card-hover` | Task-Karten |
| `--shadow-popover` | Selects, Filter-Popover, Overflow, Toasts — inkl. Hairline |
| `--shadow-overlay` | Dialoge, Command Palette |

Dark-Shadows nutzen starke schwarze Opacity (nicht Light-Mode-Warmton), sonst verschwinden sie auf Obsidian-Flächen.

Floating-Komponenten **müssen** `--color-bg-elevated` nutzen (nicht `--color-bg-surface`).

---

## 4. Typografie

### 4.1 Families

```css
--font-family-sans: "Geist", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
--font-family-mono: "Geist Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
```

Dateien: `public/fonts/Geist-Variable.woff2` (~68 KB), `GeistMono-Variable.woff2` (~70 KB).

### 4.2 Loading-Vertrag

| Maßnahme | Detail |
|---|---|
| Self-host | gleiche Origin, kein Google Fonts |
| `font-display: swap` | kein FOIT |
| Preload | **nur** Geist Sans in `app/index.html` (und Marketing-Seiten) |
| Mono | CSS-Discovery, kein Preload |
| Fallback | System-Stack bis Swap |
| `font-synthesis: none` | keine Fake-Bold/Italic |

Definition: `src/styles/fonts.css` (vor Tokens gelinkt).

### 4.3 Scale & Weights

| Token | Wert |
|---|---|
| `--font-size-xs` … `--font-size-2xl` | 12px → 24px |
| `--font-weight-normal/medium/semibold/bold` | 400 / 500 / 600 / 700 |
| Line-heights | tight 1.25 / normal 1.5 / relaxed 1.625 |

Mono: Issue-Keys, IDs, Shortcuts, Code-Snippets im Backoffice.

---

## 5. Spacing, Radius, Motion

- Spacing über `--space-*` (4px-Raster).
- Radii: `--radius-xs` … `--radius-2xl`, Squircle wo unterstützt (`corner-shape: squircle`).
- Concentric nesting: `R_inner = max(0, R_outer − padding)`.
- Motion: `--duration-instant/fast/normal/enter`, `--ease-out`, `--ease-emphasized`.
- `prefers-reduced-motion: reduce` dämpft dekorative Animationen (`reset.css`).

---

## 6. Brand / Logo

Assets unter `public/brand/` und Favicon/OG im `public/`-Root. Regeln: `public/brand/README.md`.

| Oberfläche | Asset |
|---|---|
| Sidebar | `lockup-horizontal-light/dark.svg` (Höhe 22 px, Theme folgt `data-theme`) |
| Favicon | `favicon.svg` (auto Light/Dark via `prefers-color-scheme`) + `favicon.ico` |
| PWA | `icon-192.png`, `icon-512.png`, `icon-maskable-512.png` |
| Social / OG | `og-image.svg` (1200×630 ViewBox) |
| Marketing-Header | `lockup-horizontal-light.svg` |

Light-Variante nur auf hellem Grund, Dark-Variante nur auf dunklem. Bildmarke min. 16 px; horizontaler Lockup min. 96 px Breite. Nicht verzerren, umfärben oder Module verschieben.

---

## 7. Komponenten-Verträge

### 7.1 CustomSelect

- Keine nativen `<select>` in der Produkt-UI (Design-Test erzwingt das).
- Menu: `role="listbox"`, Optionen `role="option"`, `aria-label` an Trigger **und** Menu.
- Portal: in offenen `<dialog>` oder `body`; `popover="manual"` für Top-Layer über `showModal()`.
- `z-index` Menu ≥ 1500.

### 7.2 Filter-Popover

- `position: fixed`, Elevated Surface + Popover-Shadow.
- Positionierung **erst nach** `appendChild` des Topbars (sonst 0,0 nach `notify()`-Remount).
- Resize/Scroll-Reposition; Outside-Click ignoriert portierte Select-Menus.

### 7.3 Dialog / Forms

- Task-Drawer: rechts angedockt (`inset: 0 0 0 auto`, `100dvh`), Elevated + Overlay-Shadow, Slide-in (`motion-drawer-in`); Scrim bleibt. Breite: Desktop `66.666vw` (⅔), ≤1024px `80vw`, ≤768px `92vw`, ≤640px Fullscreen.
- Essentials zuerst (Titel, Status, Priorität, Fällig, **Beschreibung** als `md-live-field--task`), Meta-Rest in `<details class="task-more-details">`.
- Sheet-Header: Issue-Key + Status-Chip (mobil sichtbar halten).
- Flex-Column nur bei `dialog.task-dialog[open]`; geschlossen immer `display: none` (sonst Fullscreen-Weißfläche auf iPhone). Mobil (≤640px): Fullscreen-Sheet (gleiche Höhe, `border-radius: 0`).
- Inputs: `min-height: 32px`, Subtle-Hintergrund.
- Milestone-Switch: **gleiche** Höhe/Padding/Radius wie `.input`.
- Date-Picker-Icons: Mask + `--color-text-secondary` (nicht OS-`color-scheme`-Ghosts).
- `color-scheme` folgt Theme (`light` / `dark`), nicht `light dark` pauschal.

### 7.4 Cards / Board

- Cards: Surface + weiche Shadows (Dark abgemildert).
- Hover-Schatten: genug Padding in Listen, damit nichts abgeschnitten wird.
- Fokus-KPIs leben auf der **Dashboard**-Startseite (nicht mehr im Kanban); Demo-Banner mit Clear-CTA am Board solange Sample-Daten existieren.
- Filterleiste ausblenden bei `getAllRawTasks().length === 0`.

### 7.5 Kunden-Seite

- ViewMode `client` (lazy wie Docs/Backoffice); Styles in `client.css`.
- Layout: Header (Swatch + Name/Code + sekundäre Board/Docs-CTAs) · KPI-Zeile · Grid Stammdaten | Kontakte/Projekte.
- Primäraktion auf der Seite: sticky Speichern am Stammdaten-Block; Topbar-CTA = „Board öffnen“.
- Surfaces wie Backoffice: `--color-bg-surface` + `--shadow-sm`, kein Card-Rahmen-Stack.
- Sidebar-Klick auf Kundenname → Kunden-Seite; Projektklick → Board mit Projekt-Scope.
- Topbar: View-Switcher ausgeblendet (Label „Kunde“), Filter ausgeblendet — analog Docs/Backoffice.
- Kontakt-Badge: i18n `client.primary` („Primär“ / „Primary“).

### 7.6 Shell / Onboarding

- Banner = einzige Primär-CTA „Ordner verbinden“; Sidebar-Connect vor Dismiss ohne Primary-Gewicht.
- Nach Onboard + Offline: kompakte Statuszeile (`sidebar-vault-compact`), volle Fläche nur bei `permission_needed` / Unsupported / vor Onboard.
- Compact-Zeile: Label + CTA gestapelt; Label max. 2 Zeilen (`line-clamp`), CTA mit Ellipsis; Breite `calc(100% − Side-Margins)`, kein Horizontal-Overflow.
- Topbar-Primäraktion kontextuell: Docs → Doc, Backoffice → Kunde, Client → Board, sonst Aufgabe.

### 7.7 Team & Zuweisung

- `WorkspaceMember` ≠ `Client`: Zuweisung geht nur über Members (intern/extern + Rolle).
- Task-Dialog: Assignee-Select mit „+ Person“; Kind-Toggle (keine nativen `<select>`).
- Backdrop-Close ignoriert `.custom-select-menu` (fixed/popover außerhalb der Dialog-Box).
- Backoffice-Tab „Team & Personen“ für Anlegen/Bearbeiten/Löschen.
- **Session-Identität:** Sidebar „Ich bin …“ (localStorage); Kommentare und Default-Assignee neuer Tasks nutzen dieses Member.
- **Team-Vault / Soft Concurrent:** Banner bei fremdem Vault-Change (Pfadliste, „Später“ dismiss); Speichern bei Stale über App-Dialog (Primary = Neu laden, Secondary = Trotzdem speichern). Playbook: `docs/TEAM-VAULT.md`.

---

## 8. Theme & Tintfield

- Theme-Toggle setzt `data-theme` + `localStorage: proman_theme_mode`.
- Backoffice: Tintfield-JSON/`--neutral-*`/`--brand-*` Overrides via `theme-manager.ts`.
- Beim Ersetzen der Skalen semantische Mappings in `tokens.css` beibehalten.

---

## 9. Checkliste bei UI-Änderungen

1. Tokens statt Magic Numbers?
2. Floating UI → `elevated` + Popover/Overlay-Shadow?
3. Kein neues natives `<select>`?
4. Form-Row-Höhen konsistent (32px-Kontrollen)?
5. Dark Mode geprüft (Elevation heller)?
6. A11y: Label, Focus, axe bei neuen Overlays?
7. Diese Datei + ggf. Design-Tests aktualisiert?

---

## 10. Referenzdateien

| Datei | Inhalt |
|---|---|
| `src/styles/tokens.css` | Primitives + Semantic + Shadows + Motion |
| `src/styles/fonts.css` | `@font-face` Geist |
| `src/styles/base.css` | Inputs, Buttons, Focus, Date-Icons |
| `src/styles/components/*` | Komponenten |
| `src/design/design-integrity.test.ts` | Automatisierte Design-Verträge |
| `public/fonts/` | Binary Fonts + OFL-Hinweis |
| `public/brand/` | Logo-Lockups, Mark, Wordmark |
| `public/favicon.svg` / `og-image.png` | Favicon + Social |
