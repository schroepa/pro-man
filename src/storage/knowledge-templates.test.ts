import { describe, it, expect } from "vitest";
import { KNOWLEDGE_CATEGORIES, isKnowledgeCategory } from "../types/knowledge";
import { knowledgeTemplate } from "./knowledge-templates";

describe("knowledge categories", () => {
  it("lists eight locked categories", () => {
    expect(KNOWLEDGE_CATEGORIES).toHaveLength(8);
    expect(isKnowledgeCategory("colors")).toBe(true);
    expect(isKnowledgeCategory("nope")).toBe(false);
  });
});

describe("knowledgeTemplate", () => {
  it("seeds markdown headings for colors (de)", () => {
    const md = knowledgeTemplate("colors", "de");
    expect(md).toContain("## Palette");
    expect(md).toContain("## Verwendung");
    expect(md).toContain("## Do / Don’t");
  });

  it("seeds english headings for mission-vision", () => {
    const md = knowledgeTemplate("mission-vision", "en");
    expect(md).toMatch(/## Mission/i);
    expect(md).toMatch(/## Vision/i);
  });
});
