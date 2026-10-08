import { describe, it, expect } from "vitest";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { ROOT } from "../test/helpers";

const LOCALES = ["de", "en"] as const;

function parseFrontmatter(raw: string): Record<string, string> {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
  if (!m) return {};
  const meta: Record<string, string> = {};
  for (const line of m[1].split(/\r?\n/)) {
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    let val = line.slice(idx + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    meta[key] = val;
  }
  return meta;
}

describe("landing + docs content integrity", () => {
  it("ships locale landings and root redirect", () => {
    expect(existsSync(join(ROOT, "index.html"))).toBe(true);
    expect(existsSync(join(ROOT, "de/index.html"))).toBe(true);
    expect(existsSync(join(ROOT, "en/index.html"))).toBe(true);
    expect(existsSync(join(ROOT, "app/index.html"))).toBe(true);
    const root = readFileSync(join(ROOT, "index.html"), "utf8");
    expect(root).toMatch(/proman_locale/);
    expect(root).toMatch(/location\.replace/);
  });

  it("AIDA landings link to app and docs", () => {
    for (const locale of LOCALES) {
      const html = readFileSync(join(ROOT, `${locale}/index.html`), "utf8");
      expect(html).toContain('href="../app/index.html"');
      expect(html).toContain('href="./docs/index.html"');
      expect(html).toMatch(/landing-hero/);
      expect(html).toMatch(/id="interest"/);
    }
  });

  it("tutorial markdown has unique slugs and required frontmatter", () => {
    for (const locale of LOCALES) {
      const dir = join(ROOT, "content/docs", locale);
      const files = readdirSync(dir).filter((f) => f.endsWith(".md"));
      expect(files.length).toBeGreaterThanOrEqual(4);
      const slugs = new Set<string>();
      for (const file of files) {
        const meta = parseFrontmatter(readFileSync(join(dir, file), "utf8"));
        expect(meta.title, file).toBeTruthy();
        expect(meta.slug, file).toBeTruthy();
        expect(meta.order, file).toBeTruthy();
        expect(slugs.has(meta.slug)).toBe(false);
        slugs.add(meta.slug);
      }
    }
  });

  it("PWA manifest scopes the app under /app/", () => {
    const manifest = JSON.parse(readFileSync(join(ROOT, "public/manifest.json"), "utf8"));
    expect(manifest.start_url).toBe("/app/");
    expect(manifest.scope).toBe("/app/");
  });
});
