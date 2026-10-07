/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, beforeEach } from "vitest";
import { store, deriveCodeFromName } from "./store";
import { makeTask, resetStoreMaps, seedClientProject, storeInternals, stubVaultWrites } from "../test/helpers";

describe("deriveCodeFromName", () => {
  it("takes initials from multi-word names", () => {
    expect(deriveCodeFromName("Web Redesign")).toBe("WR");
  });

  it("truncates single words to 4 chars", () => {
    expect(deriveCodeFromName("Platform")).toBe("PLAT");
  });

  it("returns empty for blank input", () => {
    expect(deriveCodeFromName("")).toBe("");
    expect(deriveCodeFromName(undefined)).toBe("");
  });
});

describe("allocateIssueKey / createTaskId", () => {
  beforeEach(() => {
    resetStoreMaps();
    stubVaultWrites();
    seedClientProject();
  });

  it("builds CLIENT-PROJECT-N keys", () => {
    expect(store.allocateIssueKey("cli-acme", "prj-web")).toBe("ACM-WEB-1");
  });

  it("increments past existing keys without capping at 999", () => {
    const s = storeInternals();
    s.tasks.set("ACM-WEB-999", makeTask({ id: "ACM-WEB-999", issueKey: "ACM-WEB-999", clientId: "cli-acme", projectId: "prj-web" }));
    expect(store.allocateIssueKey("cli-acme", "prj-web")).toBe("ACM-WEB-1000");
  });

  it("falls back to client-only prefix without project", () => {
    expect(store.allocateIssueKey("cli-acme")).toBe("ACM-1");
  });

  it("createTaskId skips collisions", () => {
    const s = storeInternals();
    s.tasks.set("ACM-WEB-1", makeTask({ id: "ACM-WEB-1", issueKey: "ACM-WEB-1", clientId: "cli-acme", projectId: "prj-web" }));
    expect(store.createTaskId("cli-acme", "prj-web")).toBe("ACM-WEB-2");
  });

  it("uses the selected client code, not a previous client's prefix", () => {
    const s = storeInternals();
    s.clients.set("cli-swt", {
      id: "cli-swt",
      name: "SWT Stadtwerke Trier",
      color: "#2563eb",
      code: "SWT",
    });
    s.projects.set("prj-app", {
      id: "prj-app",
      clientId: "cli-swt",
      name: "Endkunden App",
      code: "APP",
    });
    // Existing Acme keys must not leak into SWT allocation
    s.tasks.set("ACM-WR-3", makeTask({ id: "ACM-WR-3", issueKey: "ACM-WR-3", clientId: "cli-acme", projectId: "prj-web" }));

    expect(store.allocateIssueKey("cli-swt", "prj-app")).toBe("SWT-APP-1");
    expect(store.createTaskId("cli-swt", "prj-app")).toBe("SWT-APP-1");
  });
});

describe("subtasks block Done", () => {
  beforeEach(() => {
    resetStoreMaps();
    stubVaultWrites();
  });

  it("canMarkDone is false while open subtasks remain", () => {
    const task = makeTask({
      subtasks: [
        { id: "s1", title: "A", completed: true },
        { id: "s2", title: "B", completed: false },
      ],
    });
    expect(store.hasIncompleteSubtasks(task)).toBe(1);
    expect(store.canMarkDone(task)).toBe(false);
  });

  it("canMarkDone is true when all subtasks complete", () => {
    const task = makeTask({
      subtasks: [
        { id: "s1", title: "A", completed: true },
        { id: "s2", title: "B", completed: true },
      ],
    });
    expect(store.canMarkDone(task)).toBe(true);
  });

  it("updateTaskStatus refuses Done with open subtasks", async () => {
    const task = makeTask({
      id: "T-OPEN",
      status: "in-progress",
      subtasks: [{ id: "s1", title: "Open", completed: false }],
    });
    storeInternals().tasks.set(task.id, task);

    await store.updateTaskStatus(task.id, "done");
    expect(storeInternals().tasks.get(task.id)?.status).toBe("in-progress");
  });

  it("updateTaskStatus allows Done when subtasks complete", async () => {
    const task = makeTask({
      id: "T-OK",
      status: "in-progress",
      subtasks: [{ id: "s1", title: "Done", completed: true }],
    });
    storeInternals().tasks.set(task.id, task);

    await store.updateTaskStatus(task.id, "done");
    expect(storeInternals().tasks.get(task.id)).toBeUndefined();
    expect(storeInternals().archivedTasks.get(task.id)?.status).toBe("done");
  });
});

describe("filters", () => {
  beforeEach(() => {
    resetStoreMaps();
    store.filterPriority = "high";
    store.filterStatus = "todo";
    store.filterQuick = "overdue";
    store.filterAssignee = "mem-you";
    store.filterCycle = "C1";
    store.searchQuery = "x";
    store.selectedClientId = "cli";
    store.selectedProjectId = "prj";
  });

  it("clearFilters resets all filter state", () => {
    store.clearFilters();
    expect(store.filterPriority).toBe("all");
    expect(store.filterStatus).toBe("all");
    expect(store.filterQuick).toBe("all");
    expect(store.filterAssignee).toBe("all");
    expect(store.filterCycle).toBe("");
    expect(store.searchQuery).toBe("");
    expect(store.selectedClientId).toBeNull();
    expect(store.selectedProjectId).toBeNull();
  });
});

describe("task archive", () => {
  beforeEach(() => {
    resetStoreMaps();
    stubVaultWrites();
  });

  it("moves active tasks to archived map", async () => {
    const task = makeTask({ id: "ACM-1", issueKey: "ACM-1" });
    storeInternals().tasks.set(task.id, task);
    await store.archiveTask(task.id);
    expect(store.getTask(task.id)).toBeUndefined();
    expect(store.getArchivedTasks()).toHaveLength(1);
    expect(store.getArchivedTasks()[0].archivedAt).toBeTruthy();
  });

  it("restore puts task back on the board", async () => {
    const task = makeTask({ id: "ACM-2", archivedAt: "2026-10-01T12:00:00.000Z" });
    storeInternals().archivedTasks.set(task.id, task);
    await store.restoreTask(task.id);
    expect(store.getTask(task.id)).toBeDefined();
    expect(store.getArchivedTasks()).toHaveLength(0);
    expect(store.getTask(task.id)?.archivedAt).toBeUndefined();
  });

  it("auto-archives when status becomes done", async () => {
    const task = makeTask({ id: "ACM-3", status: "in-progress" });
    storeInternals().tasks.set(task.id, task);
    await store.updateTaskStatus(task.id, "done");
    expect(store.getTask(task.id)).toBeUndefined();
    expect(store.getArchivedTasks()[0]?.status).toBe("done");
  });

  it("createTaskId avoids ids in the archive", () => {
    seedClientProject();
    storeInternals().archivedTasks.set(
      "ACM-WEB-1",
      makeTask({ id: "ACM-WEB-1", issueKey: "ACM-WEB-1", clientId: "cli-acme", projectId: "prj-web" })
    );
    expect(store.createTaskId("cli-acme", "prj-web")).toBe("ACM-WEB-2");
  });
});
