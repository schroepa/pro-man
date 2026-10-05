import { describe, it, expect } from "vitest";
import { docToMarkdown, markdownToDoc } from "./doc-serializer";
import type { DocItem } from "../types/doc";

function sampleDoc(overrides: Partial<DocItem> = {}): DocItem {
  return {
    id: "DOC-100",
    clientId: "cli-internal",
    projectId: "prj-core-dev",
    title: "Doc Roundtrip",
    content: "# Hello\n\nBody text with [[Wikilink]].",
    tags: ["docs", "test"],
    parentDocId: "DOC-001",
    createdAt: "2026-10-01T10:00:00.000Z",
    updatedAt: "2026-10-05T12:00:00.000Z",
    ...overrides,
  };
}

describe("doc-serializer", () => {
  it("round-trips core doc fields through markdown", () => {
    const original = sampleDoc();
    const md = docToMarkdown(original);
    const parsed = markdownToDoc(md, "FALLBACK");

    expect(parsed.id).toBe(original.id);
    expect(parsed.clientId).toBe(original.clientId);
    expect(parsed.projectId).toBe(original.projectId);
    expect(parsed.title).toBe(original.title);
    expect(parsed.tags).toEqual(original.tags);
    expect(parsed.parentDocId).toBe(original.parentDocId);
    expect(parsed.content).toContain("[[Wikilink]]");
  });

  it("falls back when frontmatter is missing", () => {
    const parsed = markdownToDoc("# Just a doc\n\nBody", "DOC-FALLBACK");
    expect(parsed.id).toBe("DOC-FALLBACK");
    expect(parsed.content).toContain("Just a doc");
  });

  it("omits parentDocId when absent", () => {
    const md = docToMarkdown(sampleDoc({ parentDocId: undefined }));
    expect(md).not.toMatch(/^parentDocId:/m);
  });
});
