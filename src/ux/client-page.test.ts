/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, beforeEach } from "vitest";
import { store } from "../storage/store";
import { renderClientView } from "../views/client-view";
import { makeTask, resetStoreMaps, seedClientProject, stubVaultWrites, storeInternals } from "../test/helpers";
import { t } from "../i18n";
import { readSrc } from "../test/helpers";

describe("Client page", () => {
  beforeEach(() => {
    resetStoreMaps();
    stubVaultWrites();
    document.body.innerHTML = "";
  });

  it("sidebar selectClient opens client view (source contract)", () => {
    const src = readSrc("components/sidebar.ts");
    expect(src).toMatch(/store\.currentView\s*=\s*"client"/);
  });

  it("renders empty state without selected client", () => {
    const root = document.createElement("div");
    renderClientView(root);
    expect(root.textContent).toContain(t().client.noClientTitle);
  });

  it("renders stammdaten, contacts, projects and KPIs for selected client", () => {
    const { clientId, projectId } = seedClientProject();
    const s = storeInternals();
    s.clients.set(clientId, {
      ...s.clients.get(clientId)!,
      email: "hello@acme.test",
      industry: "SaaS",
      contacts: [{ id: "con-1", name: "Ada", role: "PM", isPrimary: true }],
    });
    s.tasks.set(
      "TASK-1",
      makeTask({ id: "TASK-1", clientId, projectId, status: "todo", title: "Ship header" })
    );
    store.selectedClientId = clientId;
    store.currentView = "client";

    const root = document.createElement("div");
    renderClientView(root);

    expect(root.querySelector(".client-page-name")?.textContent).toBe("Acme Corp");
    expect(root.querySelector("#client-edit-form")).toBeTruthy();
    expect(root.textContent).toContain("Ada");
    expect(root.textContent).toContain("Web Redesign");
    expect(root.querySelectorAll(".client-metric-value").length).toBeGreaterThanOrEqual(3);
  });

  it("saves stammdaten via updateClient", async () => {
    const { clientId } = seedClientProject();
    store.selectedClientId = clientId;

    const root = document.createElement("div");
    renderClientView(root);

    const nameInput = root.querySelector<HTMLInputElement>("#cv-name")!;
    nameInput.value = "Acme Updated";
    const form = root.querySelector<HTMLFormElement>("#client-edit-form")!;
    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));

    await viWait();
    expect(store.getClient(clientId)?.name).toBe("Acme Updated");
  });

  it("project row opens kanban scoped to project", () => {
    const { clientId, projectId } = seedClientProject();
    store.selectedClientId = clientId;
    store.currentView = "client";

    const root = document.createElement("div");
    renderClientView(root);
    root.querySelector<HTMLButtonElement>(`.client-project-row[data-project-id="${projectId}"]`)!.click();

    expect(store.currentView).toBe("kanban");
    expect(store.selectedClientId).toBe(clientId);
    expect(store.selectedProjectId).toBe(projectId);
  });
});

function viWait(): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, 0));
}
