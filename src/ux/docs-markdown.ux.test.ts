/**
 * @vitest-environment node
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("Docs Markdown UX", () => {
  it("uses MarkdownLiveField instead of edit/preview tabs", () => {
    const src = readFileSync(resolve(__dirname, "../views/docs-view.ts"), "utf8");
    expect(src).toContain("MarkdownLiveField");
    expect(src).toContain("md-live-field--docs");
    expect(src).toContain("bindWikilinks");
    expect(src).not.toContain("md-tab-btn");
    expect(src).not.toContain("doc-preview-pane");
  });
});
