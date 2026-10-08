/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, beforeEach } from "vitest";
import { store } from "./store";
import { resetStoreMaps, seedClientProject, storeInternals, stubVaultWrites } from "../test/helpers";
import type { KnowledgeItem } from "../types/knowledge";

function kn(partial: Partial<KnowledgeItem> & Pick<KnowledgeItem, "id" | "category" | "title">): KnowledgeItem {
  return {
    clientId: "cli-acme",
    content: "",
    tags: [],
    createdAt: "2026-10-01T10:00:00.000Z",
    updatedAt: "2026-10-01T10:00:00.000Z",
    ...partial,
  };
}

describe("knowledge store B3", () => {
  beforeEach(() => {
    resetStoreMaps();
    stubVaultWrites();
    seedClientProject();
    store.selectedClientId = "cli-acme";
    store.selectedProjectId = "prj-web";
  });

  it("merges client items as read-only in project view", () => {
    const s = storeInternals() as any;
    s.knowledge.set("KN-c", kn({ id: "KN-c", category: "colors", title: "Client colors" }));
    s.knowledge.set("KN-p", kn({ id: "KN-p", category: "colors", title: "Project colors", projectId: "prj-web" }));
    const list = store.getKnowledgeForProjectView("cli-acme", "prj-web");
    expect(list).toHaveLength(2);
    expect(list.find(e => e.item.id === "KN-c")?.readOnly).toBe(true);
    expect(list.find(e => e.item.id === "KN-p")?.readOnly).toBe(false);
  });

  it("canEditKnowledge is false for client items when project selected", () => {
    const item = kn({ id: "KN-c", category: "logic", title: "L" });
    expect(store.canEditKnowledge(item)).toBe(false);
    store.selectedProjectId = null;
    expect(store.canEditKnowledge(item)).toBe(true);
  });
});
