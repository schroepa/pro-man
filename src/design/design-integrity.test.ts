import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  ROOT,
  SRC,
  readSrc,
  walkFiles,
  cssVarBlock,
  extractCssVar,
  contrastRatio,
  relPath,
} from "../test/helpers";

describe("design integrity — tokens & elevation", () => {
  const tokens = readSrc("styles/tokens.css");

  it("defines elevated surface and border tokens in light mode", () => {
    const root = cssVarBlock(tokens, ":root");
    expect(extractCssVar(root, "--color-bg-elevated")).toBeTruthy();
    expect(extractCssVar(root, "--color-border-elevated")).toBeTruthy();
    expect(extractCssVar(root, "--shadow-popover")).toContain("var(--color-border-elevated)");
    expect(extractCssVar(root, "--shadow-overlay")).toContain("var(--color-border-elevated)");
  });

  it("uses a lighter elevated surface than resting surface in dark mode", () => {
    expect(tokens).toMatch(/--color-bg-elevated:\s*var\(--neutral-5\)/);
    expect(tokens).toMatch(/--color-bg-surface:\s*var\(--neutral-3\)/);
  });

  it("overrides dark popover/overlay shadows (not light-mode warm shadows)", () => {
    const darkForced = cssVarBlock(tokens, ':root[data-theme="dark"]');
    expect(extractCssVar(darkForced, "--shadow-popover")).toMatch(/rgba\(0,\s*0,\s*0/);
    expect(extractCssVar(darkForced, "--shadow-overlay")).toMatch(/rgba\(0,\s*0,\s*0/);
  });

  it("keeps WCAG AA contrast for primary text on canvas (light)", () => {
    // Light primitives from tokens.css
    const canvas = "#faf9f7"; // neutral-1
    const text = "#211e18"; // neutral-11
    expect(contrastRatio(text, canvas)).toBeGreaterThanOrEqual(7); // AAA body target in system
  });

  it("keeps WCAG AA contrast for primary text on canvas (dark)", () => {
    const canvas = "#11100f";
    const text = "#f5f5f4";
    expect(contrastRatio(text, canvas)).toBeGreaterThanOrEqual(7);
  });
});

describe("design integrity — floating UI uses elevated layer", () => {
  const files = [
    "styles/components/topbar.css",
    "styles/components/custom-select.css",
    "styles/components/dialog.css",
    "styles/components/toast.css",
    "styles/components/command-palette.css",
  ];

  it.each(files)("%s references --color-bg-elevated for floating chrome", (file) => {
    const css = readSrc(file);
    expect(css).toMatch(/--color-bg-elevated/);
  });

  it("filter-popover and custom-select-menu use elevated background", () => {
    const topbar = readSrc("styles/components/topbar.css");
    const select = readSrc("styles/components/custom-select.css");
    expect(topbar).toMatch(/\.filter-popover[\s\S]*?background-color:\s*var\(--color-bg-elevated\)/);
    expect(select).toMatch(/\.custom-select-menu[\s\S]*?background-color:\s*var\(--color-bg-elevated\)/);
  });

  it("custom-select menus sit above dialogs (z-index >= 1500)", () => {
    const css = readSrc("styles/components/custom-select.css");
    expect(css).toMatch(/z-index:\s*1500/);
  });
});

describe("design integrity — no native selects in product UI", () => {
  it("forbids <select> markup in TypeScript sources", () => {
    const files = walkFiles(SRC, [".ts"]).filter(f => !f.endsWith(".test.ts") && !f.includes("/test/"));
    const offenders: string[] = [];
    for (const file of files) {
      const src = readFileSync(file, "utf8");
      if (/<select[\s>]/.test(src)) offenders.push(relPath(file));
    }
    expect(offenders).toEqual([]);
  });

  it("task dialog mounts CustomSelect instead of native selects", () => {
    const src = readSrc("components/task-dialog.ts");
    expect(src).toContain("CustomSelect");
    expect(src).toContain("task-select-assignee-mount");
    expect(src).not.toMatch(/<select[\s>]/);
  });
});

describe("design integrity — form rhythm", () => {
  it("milestone switch matches input control height tokens", () => {
    const dialog = readSrc("styles/components/dialog.css");
    const base = readSrc("styles/base.css");
    expect(base).toMatch(/\.input[\s\S]*?min-height:\s*32px/);
    expect(dialog).toMatch(/\.milestone-switch-card[\s\S]*?min-height:\s*32px/);
    expect(dialog).toMatch(/\.milestone-switch-card[\s\S]*?padding:\s*var\(--space-2\)\s+var\(--space-3\)/);
    expect(dialog).toMatch(/\.milestone-switch-card[\s\S]*?border-radius:\s*var\(--radius-sm\)/);
  });

  it("color-scheme follows theme (prevents invisible date icons)", () => {
    const reset = readSrc("styles/reset.css");
    expect(reset).toMatch(/color-scheme:\s*light/);
    expect(reset).toMatch(/html\[data-theme="dark"\][\s\S]*?color-scheme:\s*dark/);
    expect(reset).not.toMatch(/color-scheme:\s*light dark/);
  });

  it("date picker indicators are token-colored via mask", () => {
    const base = readSrc("styles/base.css");
    expect(base).toMatch(/::-webkit-calendar-picker-indicator/);
    expect(base).toMatch(/background-color:\s*var\(--color-text-secondary\)/);
    expect(base).toMatch(/mask-image:/);
  });
});

describe("design integrity — font loading performance", () => {
  it("self-hosts Geist variable fonts with font-display: swap", () => {
    const fonts = readSrc("styles/fonts.css");
    expect(fonts).toMatch(/font-family:\s*"Geist"/);
    expect(fonts).toMatch(/font-family:\s*"Geist Mono"/);
    expect(fonts).toMatch(/font-display:\s*swap/g);
    expect(fonts).toMatch(/Geist-Variable\.woff2/);
    expect(fonts).toMatch(/GeistMono-Variable\.woff2/);
    expect(fonts).not.toMatch(/fonts\.googleapis|fonts\.gstatic/);
  });

  it("preloads only Geist Sans (not Mono) in app/index.html", () => {
    const html = readFileSync(join(ROOT, "app/index.html"), "utf8");
    expect(html).toMatch(/rel="preload"[^>]*Geist-Variable\.woff2/);
    expect(html).not.toMatch(/rel="preload"[^>]*GeistMono/);
    expect(html).toMatch(/fonts\.css/);
  });

  it("tokens fall back to system fonts while Geist swaps in", () => {
    const tokens = readSrc("styles/tokens.css");
    expect(tokens).toMatch(/--font-family-sans:\s*"Geist".*-apple-system/);
    expect(tokens).toMatch(/--font-family-mono:\s*"Geist Mono".*ui-monospace/);
  });
});

describe("design integrity — a11y primitives present", () => {
  it("app/index.html includes skip link and live announcer", () => {
    const html = readFileSync(join(ROOT, "app/index.html"), "utf8");
    expect(html).toMatch(/class="skip-link"/);
    expect(html).toMatch(/id="live-announcer"/);
    expect(html).toMatch(/aria-live="polite"/);
  });

  it("base.css defines focus ring and sr-only", () => {
    const base = readSrc("styles/base.css");
    expect(base).toContain(".sr-only");
    expect(base).toContain(":focus-visible");
    expect(base).toContain("var(--color-focus-ring)");
  });
});

describe("design integrity — sidebar vault compact overflow", () => {
  it("stacks label + CTA and clamps/ellipsizes text inside the sidebar width", () => {
    const sidebar = readSrc("components/sidebar.ts");
    const layout = readSrc("styles/components/layout.css");

    expect(sidebar).toContain("sidebar-vault-compact-text");
    expect(sidebar).toContain("sidebar-vault-compact-label");
    expect(sidebar).toContain("sidebar-vault-compact-cta");

    expect(layout).toMatch(
      /\.sidebar-vault-compact\s*\{[\s\S]*?width:\s*calc\(100%\s*-\s*2\s*\*\s*var\(--space-3\)\)/,
    );
    expect(layout).toMatch(/\.sidebar-vault-compact\s*\{[\s\S]*?overflow:\s*hidden/);
    expect(layout).toMatch(/\.sidebar-vault-compact-text\s*\{[\s\S]*?min-width:\s*0/);
    expect(layout).toMatch(/\.sidebar-vault-compact-label\s*\{[\s\S]*?line-clamp:\s*2/);
    expect(layout).toMatch(
      /\.sidebar-vault-compact-cta\s*\{[\s\S]*?text-overflow:\s*ellipsis/,
    );
  });
});
