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
