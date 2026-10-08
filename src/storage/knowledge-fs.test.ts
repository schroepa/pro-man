/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, beforeEach } from "vitest";
import { VaultStorage } from "./file-system";
import type { KnowledgeItem } from "../types/knowledge";

describe("VaultStorage knowledge fallback", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("saves and loads knowledge without a vault handle", async () => {
    const storage = new VaultStorage();
    const item: KnowledgeItem = {
      id: "KN-1",
      clientId: "cli-acme",
      category: "logic",
      title: "Rules",
      content: "## Rules\n- A",
      tags: [],
      createdAt: "2026-10-01T10:00:00.000Z",
      updatedAt: "2026-10-01T10:00:00.000Z",
    };
    await storage.saveKnowledge(item);
    const all = await storage.loadAllKnowledge();
    expect(all).toHaveLength(1);
    expect(all[0].title).toBe("Rules");
    await storage.deleteKnowledge("KN-1");
    expect(await storage.loadAllKnowledge()).toHaveLength(0);
  });
});
