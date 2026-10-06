/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { store } from "../storage/store";
import { renderKanbanBoard } from "../views/kanban-board";
import { renderListView } from "../views/list-view";
import { renderGanttChart } from "../views/gantt-chart";
import {
  ONBOARD_KEY,
  renderOnboardingBanner,
  isOnboarded,
  markOnboarded,
} from "../components/onboarding-banner";
import { makeTask, resetStoreMaps, seedClientProject, stubVaultWrites } from "../test/helpers";
import { t } from "../i18n";

describe("Onboarding banner", () => {
  beforeEach(() => {
    localStorage.removeItem(ONBOARD_KEY);
    document.body.innerHTML = "";
  });

  it("renders folder connect as primary and sample-data start as secondary", () => {
    const banner = renderOnboardingBanner(() => {});
    expect(banner).not.toBeNull();
    const connect = banner!.querySelector("#onboard-connect") as HTMLButtonElement;
    const dismiss = banner!.querySelector("#onboard-dismiss") as HTMLButtonElement;
    expect(connect.classList.contains("btn-primary")).toBe(true);
    expect(dismiss.classList.contains("btn-secondary")).toBe(true);
    expect(connect.textContent).toBe(t().actions.connectVault);
    expect(dismiss.textContent).toBe(t().onboarding.dismiss);
    expect(banner!.textContent).toContain(t().empty.demoBadge);
  });

  it("dismiss marks onboarded and calls callback", () => {
    const onDismiss = vi.fn();
    const banner = renderOnboardingBanner(onDismiss)!;
    banner.querySelector<HTMLButtonElement>("#onboard-dismiss")!.click();
    expect(isOnboarded()).toBe(true);
    expect(onDismiss).toHaveBeenCalledOnce();
  });

  it("returns null when already onboarded", () => {
    markOnboarded();
    expect(renderOnboardingBanner(() => {})).toBeNull();
  });
});

describe("Empty states — workspace vs filter", () => {
  beforeEach(() => {
    resetStoreMaps();
    stubVaultWrites();
    document.body.innerHTML = "";
  });

  it("board shows first-task CTA when workspace has zero tasks", () => {
    const root = document.createElement("div");
    const onNew = vi.fn();
    renderKanbanBoard(root, () => {}, onNew);
    expect(root.textContent).toContain(t().empty.workspaceTitle);
    expect(root.querySelector("#empty-workspace-new-task")).toBeTruthy();
    expect(root.querySelector(".dashboard-kpi-bar")).toBeNull();
    root.querySelector<HTMLButtonElement>("#empty-workspace-new-task")!.click();
    expect(onNew).toHaveBeenCalledWith("todo");
  });

  it("board shows filter reset when tasks exist but filters hide all", () => {
    const { clientId, projectId } = seedClientProject();
    storeInternalsSeed(clientId, projectId);
    store.filterPriority = "urgent";
    const root = document.createElement("div");
    renderKanbanBoard(root, () => {}, () => {});
    expect(root.textContent).toContain(t().kanban.emptyFilteredTitle);
    expect(root.querySelector("#reset-board-filter-btn")).toBeTruthy();
    expect(root.querySelector("#empty-workspace-new-task")).toBeNull();
  });

  it("list shows first-task CTA when workspace is empty", () => {
    const root = document.createElement("div");
    const onNew = vi.fn();
    renderListView(root, () => {}, onNew);
    expect(root.textContent).toContain(t().empty.workspaceTitle);
    root.querySelector<HTMLButtonElement>("#list-empty-new-task")!.click();
    expect(onNew).toHaveBeenCalledOnce();
  });

  it("list shows filter reset when filters hide all tasks", () => {
    const { clientId, projectId } = seedClientProject();
    storeInternalsSeed(clientId, projectId);
    store.filterPriority = "urgent";
    const root = document.createElement("div");
    renderListView(root, () => {}, () => {});
    expect(root.textContent).toContain(t().list.emptyTitle);
    expect(root.querySelector("#list-reset-filters")).toBeTruthy();
  });

  it("gantt empty state uses i18n and optional new-task CTA", () => {
    const root = document.createElement("div");
    const onNew = vi.fn();
    renderGanttChart(root, () => {}, onNew);
    expect(root.textContent).toContain(t().gantt.emptyTitle);
    expect(root.textContent).toContain(t().gantt.emptyDesc);
    root.querySelector<HTMLButtonElement>("#gantt-empty-new-task")!.click();
    expect(onNew).toHaveBeenCalledOnce();
  });

  it("hasActiveTaskFilters tracks filter state", () => {
    expect(store.hasActiveTaskFilters()).toBe(false);
    store.filterPriority = "high";
    expect(store.hasActiveTaskFilters()).toBe(true);
    store.clearFilters();
    expect(store.hasActiveTaskFilters()).toBe(false);
  });
});

function storeInternalsSeed(clientId: string, projectId: string): void {
  const task = makeTask({
    id: "TASK-SEED",
    clientId,
    projectId,
    priority: "normal",
    title: "Seeded",
  });
  (store as unknown as { tasks: Map<string, typeof task> }).tasks.set(task.id, task);
}
