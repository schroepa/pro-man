/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, beforeEach } from "vitest";
import { store } from "../storage/store";
import { renderBackofficeView } from "../views/backoffice-view";
import { renderDashboardView } from "../views/dashboard-view";
import { makeTask, resetStoreMaps, seedClientProject, stubVaultWrites } from "../test/helpers";

describe("Vault health UX", () => {
  beforeEach(() => {
    resetStoreMaps();
    stubVaultWrites();
    document.body.innerHTML = "";
    try {
      sessionStorage.clear();
    } catch { /* ignore */ }
  });

  it("renders Prüfen-tab panel in backoffice", () => {
    const { clientId, projectId } = seedClientProject();
    const s = store as unknown as { tasks: Map<string, ReturnType<typeof makeTask>> };
    s.tasks.set("T-1", makeTask({
      id: "T-1",
      clientId,
      projectId,
      status: "todo",
      dueDate: "2020-01-01",
      issueKey: "ACM-WEB-9",
    }));

    try {
      sessionStorage.setItem("proman_backoffice_tab", "vault");
    } catch { /* ignore */ }

    const root = document.createElement("div");
    renderBackofficeView(root);

    const panel = root.querySelector("[data-testid='vault-health-panel']");
    expect(panel).toBeTruthy();
    expect(root.textContent).toMatch(/Prüfen|Check/);
    expect(root.textContent).toContain("ACM-WEB-9");
    expect(root.querySelector("#vault-export-md")).toBeTruthy();
    expect(root.querySelector("#vault-export-csv")).toBeTruthy();
  });

  it("dashboard continue link opens vault health tab", () => {
    const { clientId, projectId } = seedClientProject();
    const s = store as unknown as { tasks: Map<string, ReturnType<typeof makeTask>> };
    s.tasks.set("T-1", makeTask({ id: "T-1", clientId, projectId, status: "todo" }));

    const root = document.createElement("div");
    renderDashboardView(root, () => {}, () => {});

    const link = root.querySelector<HTMLButtonElement>('[data-go="vault-health"]');
    expect(link).toBeTruthy();
    link!.click();
    expect(store.currentView).toBe("backoffice");
    expect(sessionStorage.getItem("proman_backoffice_tab")).toBe("vault");
  });
});
