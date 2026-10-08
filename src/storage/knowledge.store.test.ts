/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, beforeEach } from "vitest";
import { store } from "./store";
import { isSampleKnowledgeId, hasSampleWorkspaceData } from "./demo-mode";
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

describe("clearDemoData purges sample knowledge", () => {
  beforeEach(() => {
    resetStoreMaps();
    stubVaultWrites();
  });

  it("isSampleKnowledgeId matches seeded KN-001/KN-002", () => {
    expect(isSampleKnowledgeId("KN-001")).toBe(true);
    expect(isSampleKnowledgeId("KN-002")).toBe(true);
    expect(isSampleKnowledgeId("KN-own")).toBe(false);
  });

  it("hasSampleWorkspaceData is true when only sample knowledge remains", () => {
    expect(hasSampleWorkspaceData([], [], ["KN-001"])).toBe(true);
    expect(hasSampleWorkspaceData([], [], ["KN-own"])).toBe(false);
  });

  it("removes KN-001/KN-002 and keeps user knowledge", async () => {
    const s = storeInternals() as any;
    s.clients.set("cli-acme", { id: "cli-acme", name: "Acme", color: "#c25e1a", code: "ACM" });
    s.projects.set("prj-web-redesign", {
      id: "prj-web-redesign",
      clientId: "cli-acme",
      name: "Web Redesign",
      code: "WR",
    });
    s.knowledge.set("KN-001", kn({ id: "KN-001", category: "colors", title: "Sample colors" }));
    s.knowledge.set(
      "KN-002",
      kn({ id: "KN-002", category: "screens-views", title: "Sample screens", projectId: "prj-web-redesign" })
    );
    s.knowledge.set("KN-own", kn({ id: "KN-own", category: "logic", title: "Own logic" }));

    expect(store.hasSampleData()).toBe(true);
    await store.clearDemoData();

    expect(s.knowledge.has("KN-001")).toBe(false);
    expect(s.knowledge.has("KN-002")).toBe(false);
    expect(s.knowledge.has("KN-own")).toBe(true);
    expect(store.hasSampleData()).toBe(false);
  });
});
