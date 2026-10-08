/**
 * Build user tutorials from content/docs/{locale}/*.md into {locale}/docs/.
 * Run via npm run build:docs.
 */
import {
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
  existsSync,
} from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { renderMarkdown } from "../src/utils/markdown";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const LOCALES = ["de", "en"] as const;
type Locale = (typeof LOCALES)[number];

interface DocMeta {
  title: string;
  description: string;
  order: number;
  slug: string;
  duration: string;
  body: string;
  locale: Locale;
}

function parseFrontmatter(raw: string): { meta: Record<string, string>; body: string } {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!m) return { meta: {}, body: raw };
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
  return { meta, body: m[2].trim() };
}

function loadDocs(locale: Locale): DocMeta[] {
  const dir = join(ROOT, "content", "docs", locale);
  if (!existsSync(dir)) return [];
  const docs: DocMeta[] = [];
  for (const name of readdirSync(dir)) {
    if (!name.endsWith(".md")) continue;
    const raw = readFileSync(join(dir, name), "utf8");
    const { meta, body } = parseFrontmatter(raw);
    const slug = meta.slug || name.replace(/\.md$/, "");
    const order = Number(meta.order || "0");
    if (!meta.title || !slug) {
      throw new Error(`Missing title/slug in ${locale}/${name}`);
    }
    docs.push({
      title: meta.title,
      description: meta.description || "",
      order: Number.isFinite(order) ? order : 0,
      slug,
      duration: meta.duration || "",
      body,
      locale,
    });
  }
  docs.sort((a, b) => a.order - b.order || a.slug.localeCompare(b.slug));
  const slugs = new Set<string>();
  for (const d of docs) {
    if (slugs.has(d.slug)) throw new Error(`Duplicate slug ${locale}/${d.slug}`);
    slugs.add(d.slug);
  }
  return docs;
}

const copy = {
  de: {
    docsNav: "Tutorials",
    openApp: "App öffnen",
    skip: "Zum Inhalt springen",
    hubTitle: "Dokumentation",
    hubLede: "Kurz und praxisnah — vom ersten Start bis zum Team auf dem Share.",
    prev: "Zurück",
    next: "Weiter",
    home: "Übersicht",
    footer: "ProMan — Local-First Project Management",
    navLabel: "Hauptnavigation",
    langLabel: "Sprache",
    pagerLabel: "Seitennavigation",
  },
  en: {
    docsNav: "Tutorials",
    openApp: "Open app",
    skip: "Skip to content",
    hubTitle: "Documentation",
    hubLede: "Short and practical — from first launch to a team on a share.",
    prev: "Previous",
    next: "Next",
    home: "Overview",
    footer: "ProMan — Local-First Project Management",
    navLabel: "Primary",
    langLabel: "Language",
    pagerLabel: "Page",
  },
} as const;

function escapeAttr(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

/** Paths relative to site/shared from docs pages */
function sharedRel(nestedSlug: boolean): string {
  return nestedSlug ? "../../../site/shared" : "../../site/shared";
}

/** Prefix from docs hub or article up to repo root */
function rootPrefix(nestedSlug: boolean): string {
  return nestedSlug ? "../../.." : "../..";
}

function links(locale: Locale, nestedSlug: boolean) {
  const root = rootPrefix(nestedSlug);
  const other = locale === "de" ? "en" : "de";
  return {
    home: nestedSlug ? "../../index.html" : "../index.html",
    docsHub: nestedSlug ? "../index.html" : "./index.html",
    docsDe: `${root}/de/docs/index.html`,
    docsEn: `${root}/en/docs/index.html`,
    docsOther: `${root}/${other}/docs/index.html`,
    app: `${root}/app/index.html`,
    tutorial: (slug: string) =>
      nestedSlug ? `../${slug}/index.html` : `./${slug}/index.html`,
  };
}

/**
 * Rewrite absolute /app|/de|/en links in markdown HTML to relative paths
 * so Vite does not emit orphan HTML assets.
 */
function relativizeBody(html: string, locale: Locale, nestedSlug: boolean): string {
  const root = rootPrefix(nestedSlug);
  return html
    .replace(/href="\/app\/(?:index\.html)?"/g, `href="${root}/app/index.html"`)
    .replace(
      /href="\/(de|en)\/docs\/([^"/]+)\/(?:index\.html)?"/g,
      (_m, loc: string, slug: string) => {
        if (loc === locale) {
          return `href="${nestedSlug ? `../${slug}/index.html` : `./${slug}/index.html`}"`;
        }
        return `href="${root}/${loc}/docs/${slug}/index.html"`;
      }
    )
    .replace(/href="\/(de|en)\/docs\/(?:index\.html)?"/g, (_m, loc: string) => {
      if (loc === locale) {
        return `href="${nestedSlug ? "../index.html" : "./index.html"}"`;
      }
      return `href="${root}/${loc}/docs/index.html"`;
    });
}

function shellHead(opts: {
  locale: Locale;
  title: string;
  description: string;
  nestedSlug: boolean;
}): string {
  const rel = sharedRel(opts.nestedSlug);
  return `<!DOCTYPE html>
<html lang="${opts.locale}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="description" content="${escapeAttr(opts.description)}" />
  <title>${escapeAttr(opts.title)} — ProMan</title>
  <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
  <meta property="og:type" content="article" />
  <meta property="og:locale" content="${opts.locale === "de" ? "de_DE" : "en_US"}" />
  <meta property="og:title" content="${escapeAttr(opts.title)}" />
  <meta property="og:description" content="${escapeAttr(opts.description)}" />
  <meta property="og:image" content="/og-image.png" />
  <link rel="preload" href="/fonts/Geist-Variable.woff2" as="font" type="font/woff2" crossorigin />
  <link rel="stylesheet" href="/src/styles/fonts.css" />
  <link rel="stylesheet" href="/src/styles/tokens.css" />
  <link rel="stylesheet" href="/src/styles/reset.css" />
  <link rel="stylesheet" href="${rel}/site.css" />
</head>`;
}

function header(locale: Locale, nestedSlug: boolean): string {
  const t = copy[locale];
  const L = links(locale, nestedSlug);
  return `<header class="site-header">
    <a class="site-brand" href="${L.home}">
      <img src="/brand/lockup-horizontal-light.svg" alt="ProMan" width="140" height="28" />
    </a>
    <nav class="site-nav" aria-label="${t.navLabel}">
      <a href="${L.docsHub}" aria-current="page">${t.docsNav}</a>
      <span class="site-lang" aria-label="${t.langLabel}">
        <a href="${L.docsDe}" data-set-locale="de"${locale === "de" ? ' aria-current="true"' : ""}>DE</a>
        <a href="${L.docsEn}" data-set-locale="en"${locale === "en" ? ' aria-current="true"' : ""}>EN</a>
      </span>
      <a class="site-btn site-btn-primary" href="${L.app}">${t.openApp}</a>
    </nav>
  </header>`;
}

function footer(locale: Locale, nestedSlug: boolean): string {
  const t = copy[locale];
  const other = locale === "de" ? "en" : "de";
  const otherLabel = locale === "de" ? "English" : "Deutsch";
  const L = links(locale, nestedSlug);
  return `<footer class="site-footer">
    <span>${t.footer}</span>
    <span>
      <a href="${L.docsHub}">${t.docsNav}</a> ·
      <a href="${L.app}">App</a> ·
      <a href="${L.docsOther}" data-set-locale="${other}">${otherLabel}</a>
    </span>
  </footer>`;
}

function sidebar(
  docs: DocMeta[],
  locale: Locale,
  currentSlug: string | null,
  nestedSlug: boolean
): string {
  const t = copy[locale];
  const L = links(locale, nestedSlug);
  const items = docs
    .map(
      (d) =>
        `<li><a href="${L.tutorial(d.slug)}"${
          currentSlug === d.slug ? ' aria-current="page"' : ""
        }>${escapeAttr(d.title)}</a></li>`
    )
    .join("\n");
  return `<aside class="docs-sidebar" aria-label="${t.docsNav}">
    <h2>${t.docsNav}</h2>
    <ol>
      <li><a href="${L.docsHub}"${currentSlug === null ? ' aria-current="page"' : ""}>${t.home}</a></li>
      ${items}
    </ol>
  </aside>`;
}

function writePage(path: string, html: string): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, html, "utf8");
}

function buildHub(locale: Locale, docs: DocMeta[]): void {
  const t = copy[locale];
  const nestedSlug = false;
  const L = links(locale, nestedSlug);
  const cards = docs
    .map(
      (d) => `<li>
      <a class="docs-hub-card" href="${L.tutorial(d.slug)}">
        <h2>${escapeAttr(d.title)}</h2>
        <p>${escapeAttr(d.description)}</p>
        ${d.duration ? `<span class="docs-hub-meta">${escapeAttr(d.duration)}</span>` : ""}
      </a>
    </li>`
    )
    .join("\n");

  const html = `${shellHead({
    locale,
    title: t.hubTitle,
    description: t.hubLede,
    nestedSlug,
  })}
<body class="site-body">
  <a class="site-skip" href="#main">${t.skip}</a>
  ${header(locale, nestedSlug)}
  <main id="main" class="site-main">
    <div class="docs-layout">
      ${sidebar(docs, locale, null, nestedSlug)}
      <div class="docs-article">
        <h1>${t.hubTitle}</h1>
        <p class="docs-lede">${t.hubLede}</p>
        <ul class="docs-hub-grid">${cards}</ul>
        <div class="docs-cta-bar">
          <a class="site-btn site-btn-primary" href="${L.app}">${t.openApp}</a>
        </div>
      </div>
    </div>
  </main>
  ${footer(locale, nestedSlug)}
  <script src="${sharedRel(nestedSlug)}/site.js" type="module"></script>
</body>
</html>
`;
  writePage(join(ROOT, locale, "docs", "index.html"), html);
}

function buildArticle(locale: Locale, docs: DocMeta[], doc: DocMeta, index: number): void {
  const t = copy[locale];
  const nestedSlug = true;
  const L = links(locale, nestedSlug);
  const prev = index > 0 ? docs[index - 1] : null;
  const next = index < docs.length - 1 ? docs[index + 1] : null;
  const bodyHtml = relativizeBody(renderMarkdown(doc.body), locale, nestedSlug);

  const pager = `<nav class="docs-pager" aria-label="${t.pagerLabel}">
    ${
      prev
        ? `<a href="${L.tutorial(prev.slug)}">← ${t.prev}: ${escapeAttr(prev.title)}</a>`
        : `<span></span>`
    }
    ${
      next
        ? `<a href="${L.tutorial(next.slug)}">${t.next}: ${escapeAttr(next.title)} →</a>`
        : `<a href="${L.docsHub}">${t.home}</a>`
    }
  </nav>`;

  const html = `${shellHead({
    locale,
    title: doc.title,
    description: doc.description,
    nestedSlug,
  })}
<body class="site-body">
  <a class="site-skip" href="#main">${t.skip}</a>
  ${header(locale, nestedSlug)}
  <main id="main" class="site-main">
    <div class="docs-layout">
      ${sidebar(docs, locale, doc.slug, nestedSlug)}
      <article class="docs-article">
        <h1>${escapeAttr(doc.title)}</h1>
        <p class="docs-lede">${escapeAttr(doc.description)}</p>
        <div class="docs-body">${bodyHtml}</div>
        ${pager}
        <div class="docs-cta-bar">
          <a class="site-btn site-btn-primary" href="${L.app}">${t.openApp}</a>
        </div>
      </article>
    </div>
  </main>
  ${footer(locale, nestedSlug)}
  <script src="${sharedRel(nestedSlug)}/site.js" type="module"></script>
</body>
</html>
`;
  writePage(join(ROOT, locale, "docs", doc.slug, "index.html"), html);
}

function cleanDocsOut(locale: Locale): void {
  const dir = join(ROOT, locale, "docs");
  if (existsSync(dir)) rmSync(dir, { recursive: true, force: true });
}

function main(): void {
  for (const locale of LOCALES) {
    cleanDocsOut(locale);
    const docs = loadDocs(locale);
    if (!docs.length) throw new Error(`No docs for locale ${locale}`);
    buildHub(locale, docs);
    docs.forEach((doc, i) => buildArticle(locale, docs, doc, i));
    console.log(`docs:${locale} → ${docs.length} tutorials + hub`);
  }
}

main();
