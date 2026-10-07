/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { store } from "../storage/store";
import { renderDashboardView } from "../views/dashboard-view";
import { makeTask, resetStoreMaps, seedClientProject, stubVaultWrites } from "../test/helpers";
import { computeTaskMetrics, getAttentionTasks } from "../utils/task-metrics";

describe("Dashboard MVP", () => {
  beforeEach(() => {
    resetStoreMaps();
    stubVaultWrites();
    document.body.innerHTML = "";
  });

  it("defaults currentView to dashboard", () => {
    expect(store.currentView).toBe("dashboard");
  });

  it("KPI click navigates to list with matching filter", () => {
    const { clientId, projectId } = seedClientProject();
    const today = new Date().toISOString().slice(0, 10);
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().slice(0, 10);

    const s = store as unknown as { tasks: Map<string, ReturnType<typeof makeTask>> };
    s.tasks.set("T-OPEN", makeTask({
      id: "T-OPEN",
      clientId,
      projectId,
      status: "todo",
      dueDate: today,
    }));
    s.tasks.set("T-OVER", makeTask({
      id: "T-OVER",
      clientId,
      projectId,
      status: "todo",
      dueDate: yesterdayStr,
    }));
    s.tasks.set("T-PROG", makeTask({
      id: "T-PROG",
      clientId,
      projectId,
      status: "in-progress",
      dueDate: today,
    }));

    const root = document.createElement("div");
    renderDashboardView(root, () => {}, () => {});

    const bar = root.querySelector("[data-testid='dashboard-kpi-bar']");
    expect(bar).toBeTruthy();

    root.querySelector<HTMLElement>('[data-kpi="urgent"]')!.click();
    expect(store.currentView).toBe("list");
    expect(store.filterQuick).toBe("overdue");

    store.currentView = "dashboard";
    store.filterQuick = "all";
    renderDashboardView(root, () => {}, () => {});
    root.querySelector<HTMLElement>('[data-kpi="due_soon"]')!.click();
    expect(store.currentView).toBe("list");
    expect(store.filterQuick).toBe("due_soon");

    store.currentView = "dashboard";
    store.filterQuick = "all";
    renderDashboardView(root, () => {}, () => {});
    root.querySelector<HTMLElement>('[data-kpi="in_progress"]')!.click();
    expect(store.currentView).toBe("list");
    expect(store.filterStatus).toBe("in-progress");

    store.currentView = "dashboard";
    store.filterStatus = "all";
    renderDashboardView(root, () => {}, () => {});
    root.querySelector<HTMLElement>('[data-kpi="open"]')!.click();
    expect(store.currentView).toBe("list");
    expect(store.filterStatus).toBe("all");
    expect(store.filterQuick).toBe("all");
  });

  it("attention row opens the task", () => {
    const { clientId, projectId } = seedClientProject();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().slice(0, 10);
    const s = store as unknown as { tasks: Map<string, ReturnType<typeof makeTask>> };
    s.tasks.set("T-ATT", makeTask({
      id: "T-ATT",
      title: "Attention please",
      clientId,
      projectId,
      status: "todo",
      dueDate: yesterdayStr,
    }));

    const onOpen = vi.fn();
    const root = document.createElement("div");
    renderDashboardView(root, onOpen, () => {});
    root.querySelector<HTMLButtonElement>('[data-task-id="T-ATT"]')!.click();
    expect(onOpen).toHaveBeenCalledWith("T-ATT");
  });

  it("shared metrics helper counts open / overdue / due soon", () => {
    const today = "2026-10-07";
    const now = new Date(`${today}T12:00:00.000Z`);
    const tasks = [
      makeTask({ id: "a", status: "todo", dueDate: "2026-10-01", priority: "normal" }),
      makeTask({ id: "b", status: "in-progress", dueDate: "2026-10-08", priority: "urgent" }),
      makeTask({ id: "c", status: "done", dueDate: "2026-10-01", priority: "normal" }),
    ];
    const m = computeTaskMetrics(tasks, now);
    expect(m.open).toBe(2);
    expect(m.overdue).toBe(1);
    expect(m.urgent).toBe(1);
    expect(m.dueSoon).toBe(1);
    expect(m.inProgress).toBe(1);

    const attention = getAttentionTasks(tasks, 8, now);
    expect(attention.map(t => t.id)).toEqual(["a"]);
  });
});
