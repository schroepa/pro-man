import { describe, it, expect } from "vitest";
import { knowledgeToMarkdown, markdownToKnowledge } from "./knowledge-serializer";
import type { KnowledgeItem } from "../types/knowledge";

function sample(overrides: Partial<KnowledgeItem> = {}): KnowledgeItem {
  return {
    id: "KN-100",
    clientId: "cli-acme",
    projectId: "prj-web",
    category: "colors",
    title: "Brand Colors",
    content: "# Brand Colors\n\n## Palette\n- Primary",
    tags: ["design"],
    createdAt: "2026-10-01T10:00:00.000Z",
    updatedAt: "2026-10-05T12:00:00.000Z",
    ...overrides,
  };
}

describe("knowledge-serializer", () => {
  it("round-trips core fields", () => {
    const original = sample();
    const parsed = markdownToKnowledge(knowledgeToMarkdown(original), "FALLBACK");
    expect(parsed.id).toBe(original.id);
    expect(parsed.clientId).toBe(original.clientId);
    expect(parsed.projectId).toBe(original.projectId);
    expect(parsed.category).toBe("colors");
    expect(parsed.title).toBe(original.title);
    expect(parsed.tags).toEqual(["design"]);
    expect(parsed.content).toContain("## Palette");
  });

  it("omits projectId for client-scoped items", () => {
    const md = knowledgeToMarkdown(sample({ projectId: undefined }));
    expect(md).not.toMatch(/^projectId:/m);
    const parsed = markdownToKnowledge(md, "FALLBACK");
    expect(parsed.projectId).toBeUndefined();
  });

  it("coerces unknown category to other", () => {
    const md = `---
id: KN-1
type: knowledge
clientId: cli-acme
category: not-a-real-category
title: "X"
createdAt: 2026-10-01T10:00:00.000Z
updatedAt: 2026-10-01T10:00:00.000Z
tags: []
---

Body`;
    expect(markdownToKnowledge(md, "KN-1").category).toBe("other");
  });

  it("falls back when frontmatter missing", () => {
    const parsed = markdownToKnowledge("# Just body", "KN-FALLBACK");
    expect(parsed.id).toBe("KN-FALLBACK");
    expect(parsed.content).toContain("Just body");
  });
});
