/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, beforeEach } from "vitest";
import { createTaskCard } from "./task-card";
import { store } from "../storage/store";
import { DEFAULT_MEMBER_YOU_ID } from "../types/member";
import { makeTask, resetStoreMaps, stubVaultWrites, storeInternals } from "../test/helpers";
import { t } from "../i18n";

describe("Task card assignee", () => {
  beforeEach(() => {
    resetStoreMaps();
    stubVaultWrites();
    storeInternals().members.set(DEFAULT_MEMBER_YOU_ID, {
      id: DEFAULT_MEMBER_YOU_ID,
      name: t().members.defaultYou,
      kind: "internal",
      role: "Designer",
      color: "#c25e1a",
    });
  });

  it("shows assignee chip with name when assigned", () => {
    const task = makeTask({ id: "TASK-1", assigneeId: DEFAULT_MEMBER_YOU_ID, title: "Design header" });
    const card = createTaskCard(task, () => {});
    const chip = card.querySelector(".task-assignee-chip");
    expect(chip).toBeTruthy();
    expect(chip?.textContent).toContain(t().members.defaultYou);
    expect(card.getAttribute("aria-label")).toContain(t().tasks.assignee);
  });

  it("hides assignee chip when unassigned", () => {
    const task = makeTask({ id: "TASK-2", title: "No owner" });
    const card = createTaskCard(task, () => {});
    expect(card.querySelector(".task-assignee-chip")).toBeNull();
  });
});
