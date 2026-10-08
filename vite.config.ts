import { defineConfig } from "vite";
import { readdirSync, existsSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

function collectHtml(dir: string, acc: string[] = []): string[] {
  if (!existsSync(dir)) return acc;
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) collectHtml(full, acc);
    else if (name.endsWith(".html")) acc.push(full);
  }
  return acc;
}

function docsHtmlInputs(root: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const locale of ["de", "en"] as const) {
    const dir = join(root, locale, "docs");
    for (const file of collectHtml(dir)) {
      const rel = file.slice(root.length + 1).replace(/\\/g, "/");
      const key = rel.replace(/\//g, "-").replace(/\.html$/, "");
      out[key] = file;
    }
  }
  return out;
}

const root = resolve(__dirname);

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        root: resolve(root, "index.html"),
        app: resolve(root, "app/index.html"),
        "landing-de": resolve(root, "de/index.html"),
        "landing-en": resolve(root, "en/index.html"),
        ...docsHtmlInputs(root),
      },
    },
  },
  server: {
    host: "127.0.0.1",
    port: 5173,
  },
});
