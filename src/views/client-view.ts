import { store, deriveCodeFromName } from "../storage/store";
import type { Client, ContactPerson, Project } from "../types/client";
import { TablerIcon } from "../components/icons";
import { showToast } from "../components/toast";
import { t } from "../i18n";

export function renderClientView(container: HTMLElement): void {
  container.innerHTML = "";

  const clientId = store.selectedClientId;
  const client = clientId ? store.getClient(clientId) : undefined;

  if (!client) {
    container.innerHTML = `
      <div class="client-page client-page-empty">
        <div class="client-empty-card">
          <div class="client-empty-icon">${TablerIcon.users({ size: 28 })}</div>
          <h1 class="client-empty-title">${escapeHtml(t().client.noClientTitle)}</h1>
          <p class="client-empty-desc">${escapeHtml(t().client.noClientDesc)}</p>
          <button type="button" class="btn btn-primary" id="client-goto-backoffice">
            ${TablerIcon.buildingStore({ size: 14 })}
            <span>${escapeHtml(t().views.backoffice)}</span>
          </button>
        </div>
      </div>
    `;
    container.querySelector("#client-goto-backoffice")?.addEventListener("click", () => {
      store.currentView = "backoffice";
      store.notify();
    });
    return;
  }

  const projects = store.getProjects(client.id);
  const tasks = store.getAllRawTasks().filter(task => task.clientId === client.id);
  const docs = store.getDocs(client.id);
  const openTasks = tasks.filter(task => task.status !== "done");
  const contacts = client.contacts || [];
  const i18n = t().client;

  const wrapper = document.createElement("div");
  wrapper.className = "client-page";
  wrapper.innerHTML = `
    <header class="client-page-header">
      <div class="client-page-identity">
        <span class="client-page-swatch" style="background-color: ${escapeHtml(client.color)};" aria-hidden="true"></span>
        <div class="client-page-titles">
          <div class="client-page-title-row">
            <h1 class="client-page-name">${escapeHtml(client.name)}</h1>
            <span class="client-page-code">${escapeHtml(client.code)}</span>
          </div>
          ${client.description ? `<p class="client-page-desc">${escapeHtml(client.description)}</p>` : ""}
          <div class="client-page-meta">
            ${client.industry ? `<span>${escapeHtml(client.industry)}</span>` : ""}
            ${client.website ? `<a href="${escapeAttr(client.website)}" target="_blank" rel="noopener noreferrer">${escapeHtml(client.website)}</a>` : ""}
            ${client.email ? `<a href="mailto:${escapeAttr(client.email)}">${escapeHtml(client.email)}</a>` : ""}
          </div>
        </div>
      </div>
      <div class="client-page-actions">
        <button type="button" class="btn btn-primary" id="client-open-board">
          ${TablerIcon.layoutKanban({ size: 14 })}
          <span>${escapeHtml(i18n.openBoard)}</span>
        </button>
        <button type="button" class="btn btn-secondary" id="client-open-docs">
          ${TablerIcon.fileText({ size: 14 })}
          <span>${escapeHtml(i18n.openDocs)}</span>
        </button>
      </div>
    </header>

    <div class="client-metrics-grid" aria-label="${escapeHtml(i18n.metrics)}">
      <div class="client-metric">
        <span class="client-metric-label">${escapeHtml(i18n.metricProjects)}</span>
        <span class="client-metric-value">${projects.length}</span>
      </div>
      <div class="client-metric">
        <span class="client-metric-label">${escapeHtml(i18n.metricOpenTasks)}</span>
        <span class="client-metric-value">${openTasks.length}</span>
        <span class="client-metric-sub">${tasks.length} ${escapeHtml(i18n.metricTasksTotal)}</span>
      </div>
      <div class="client-metric">
        <span class="client-metric-label">${escapeHtml(i18n.metricDocs)}</span>
        <span class="client-metric-value">${docs.length}</span>
      </div>
      <div class="client-metric">
        <span class="client-metric-label">${escapeHtml(i18n.metricContacts)}</span>
        <span class="client-metric-value">${contacts.length}</span>
      </div>
    </div>

    <div class="client-page-grid">
      <section class="client-section" aria-labelledby="client-stammdaten-title">
        <div class="client-section-header">
          <h2 id="client-stammdaten-title" class="client-section-title">${escapeHtml(i18n.stammdaten)}</h2>
        </div>
        <form id="client-edit-form" class="client-edit-form">
          <div class="form-row-2">
            <div class="form-group">
              <label class="form-label" for="cv-name">${escapeHtml(i18n.fieldName)}</label>
              <input type="text" id="cv-name" name="name" class="input" required value="${escapeHtml(client.name)}" />
            </div>
            <div class="form-row-2">
              <div class="form-group">
                <label class="form-label" for="cv-code">${escapeHtml(i18n.fieldCode)}</label>
                <input type="text" id="cv-code" name="code" class="input" required maxlength="4" value="${escapeHtml(client.code)}" />
              </div>
              <div class="form-group">
                <label class="form-label" for="cv-color">${escapeHtml(i18n.fieldColor)}</label>
                <input type="color" id="cv-color" name="color" class="input" value="${escapeHtml(client.color)}" style="height: 32px; padding: 2px;" />
              </div>
            </div>
          </div>
          <div class="form-row-2" style="margin-top: var(--space-2);">
            <div class="form-group">
              <label class="form-label" for="cv-website">${escapeHtml(i18n.fieldWebsite)}</label>
              <input type="url" id="cv-website" name="website" class="input" value="${escapeHtml(client.website || "")}" />
            </div>
            <div class="form-group">
              <label class="form-label" for="cv-email">${escapeHtml(i18n.fieldEmail)}</label>
              <input type="email" id="cv-email" name="email" class="input" value="${escapeHtml(client.email || "")}" />
            </div>
          </div>
          <div class="form-row-2" style="margin-top: var(--space-2);">
            <div class="form-group">
              <label class="form-label" for="cv-phone">${escapeHtml(i18n.fieldPhone)}</label>
              <input type="tel" id="cv-phone" name="phone" class="input" value="${escapeHtml(client.phone || "")}" />
            </div>
            <div class="form-group">
              <label class="form-label" for="cv-industry">${escapeHtml(i18n.fieldIndustry)}</label>
              <input type="text" id="cv-industry" name="industry" class="input" value="${escapeHtml(client.industry || "")}" />
            </div>
          </div>
          <div class="form-row-2" style="margin-top: var(--space-2);">
            <div class="form-group">
              <label class="form-label" for="cv-address">${escapeHtml(i18n.fieldAddress)}</label>
              <input type="text" id="cv-address" name="address" class="input" value="${escapeHtml(client.address || "")}" />
            </div>
            <div class="form-group">
              <label class="form-label" for="cv-taxid">${escapeHtml(i18n.fieldTaxId)}</label>
              <input type="text" id="cv-taxid" name="taxId" class="input" value="${escapeHtml(client.taxId || "")}" />
            </div>
          </div>
          <div class="form-group" style="margin-top: var(--space-2);">
            <label class="form-label" for="cv-desc">${escapeHtml(i18n.fieldDescription)}</label>
            <input type="text" id="cv-desc" name="description" class="input" value="${escapeHtml(client.description || "")}" />
          </div>
          <div class="form-group" style="margin-top: var(--space-2);">
            <label class="form-label" for="cv-notes">${escapeHtml(i18n.fieldNotes)}</label>
            <textarea id="cv-notes" name="notes" class="textarea" rows="3">${escapeHtml(client.notes || "")}</textarea>
          </div>
          <div class="client-form-actions">
            <button type="submit" class="btn btn-primary">${escapeHtml(t().actions.save)}</button>
          </div>
        </form>
      </section>

      <div class="client-side-stack">
        <section class="client-section" aria-labelledby="client-contacts-title">
          <div class="client-section-header">
            <h2 id="client-contacts-title" class="client-section-title">${escapeHtml(i18n.contacts)} (${contacts.length})</h2>
          </div>
          <div class="client-contacts-list">
            ${contacts.map(contact => `
              <div class="client-contact-row" data-contact-id="${escapeAttr(contact.id)}">
                <div class="client-contact-info">
                  <strong>${escapeHtml(contact.name)}</strong>
                  ${contact.isPrimary ? `<span class="client-contact-primary">${escapeHtml(i18n.primary)}</span>` : ""}
                  ${contact.role ? `<span class="client-contact-meta">${escapeHtml(contact.role)}</span>` : ""}
                  ${contact.email ? `<span class="client-contact-meta">${escapeHtml(contact.email)}</span>` : ""}
                  ${contact.phone ? `<span class="client-contact-meta">${escapeHtml(contact.phone)}</span>` : ""}
                </div>
                <button type="button" class="btn btn-ghost client-delete-contact" data-contact-id="${escapeAttr(contact.id)}" title="${escapeHtml(t().actions.delete)}" aria-label="${escapeHtml(t().actions.delete)}">
                  ${TablerIcon.x({ size: 12 })}
                </button>
              </div>
            `).join("") || `<p class="client-empty-hint">${escapeHtml(i18n.noContacts)}</p>`}
          </div>
          <form id="client-add-contact-form" class="client-add-contact-form">
            <input type="text" name="name" class="input" placeholder="${escapeHtml(i18n.contactName)}" required />
            <input type="text" name="role" class="input" placeholder="${escapeHtml(i18n.contactRole)}" />
            <input type="email" name="email" class="input" placeholder="${escapeHtml(i18n.fieldEmail)}" />
            <input type="tel" name="phone" class="input" placeholder="${escapeHtml(i18n.fieldPhone)}" />
            <label class="client-primary-check" title="${escapeHtml(i18n.primary)}">
              <input type="checkbox" name="isPrimary" />
              <span>${escapeHtml(i18n.primary)}</span>
            </label>
            <button type="submit" class="btn btn-secondary">
              ${TablerIcon.plus({ size: 12 })}
              <span>${escapeHtml(i18n.addContact)}</span>
            </button>
          </form>
        </section>

        <section class="client-section" aria-labelledby="client-projects-title">
          <div class="client-section-header">
            <h2 id="client-projects-title" class="client-section-title">${escapeHtml(i18n.projects)} (${projects.length})</h2>
          </div>
          <div class="client-projects-list">
            ${projects.map(prj => {
              const prjTasks = tasks.filter(task => task.projectId === prj.id);
              const prjOpen = prjTasks.filter(task => task.status !== "done").length;
              return `
                <button type="button" class="client-project-row" data-project-id="${escapeAttr(prj.id)}">
                  <span class="client-project-hash" aria-hidden="true">#</span>
                  <span class="client-project-name">${escapeHtml(prj.name)}</span>
                  ${prj.code ? `<span class="client-project-code">${escapeHtml(prj.code)}</span>` : ""}
                  <span class="client-project-stats">${prjOpen}/${prjTasks.length}</span>
                </button>
              `;
            }).join("") || `<p class="client-empty-hint">${escapeHtml(i18n.noProjects)}</p>`}
          </div>
          <form id="client-add-project-form" class="client-add-project-form">
            <input type="text" name="name" class="input" placeholder="${escapeHtml(i18n.newProjectPlaceholder)}" required />
            <input type="text" name="code" class="input" maxlength="6" placeholder="${escapeHtml(i18n.fieldCode)}" style="width: 80px; text-transform: uppercase;" />
            <button type="submit" class="btn btn-secondary">
              ${TablerIcon.plus({ size: 12 })}
              <span>${escapeHtml(t().actions.add)}</span>
            </button>
          </form>
        </section>
      </div>
    </div>
  `;

  container.appendChild(wrapper);
  bindClientView(wrapper, client);
}

function bindClientView(root: HTMLElement, client: Client): void {
  const i18n = t().client;

  root.querySelector("#client-open-board")?.addEventListener("click", () => {
    store.selectedClientId = client.id;
    store.selectedProjectId = null;
    store.currentView = "kanban";
    store.notify();
  });

  root.querySelector("#client-open-docs")?.addEventListener("click", () => {
    store.selectedClientId = client.id;
    store.selectedProjectId = null;
    store.currentView = "docs";
    store.notify();
  });

  root.querySelectorAll<HTMLButtonElement>(".client-project-row").forEach(btn => {
    btn.addEventListener("click", () => {
      const projectId = btn.dataset.projectId;
      if (!projectId) return;
      store.selectedClientId = client.id;
      store.selectedProjectId = projectId;
      store.currentView = "kanban";
      store.notify();
    });
  });

  root.querySelector<HTMLFormElement>("#client-edit-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const form = e.currentTarget as HTMLFormElement;
    const fd = new FormData(form);
    const updated: Client = {
      ...client,
      name: String(fd.get("name") || "").trim(),
      code: String(fd.get("code") || "").trim().toUpperCase(),
      color: String(fd.get("color") || client.color),
      website: String(fd.get("website") || "").trim() || undefined,
      email: String(fd.get("email") || "").trim() || undefined,
      phone: String(fd.get("phone") || "").trim() || undefined,
      industry: String(fd.get("industry") || "").trim() || undefined,
      address: String(fd.get("address") || "").trim() || undefined,
      taxId: String(fd.get("taxId") || "").trim() || undefined,
      description: String(fd.get("description") || "").trim() || undefined,
      notes: String(fd.get("notes") || "").trim() || undefined,
      updatedAt: new Date().toISOString(),
    };
    if (!updated.name || !updated.code) return;
    await store.updateClient(updated);
    showToast(i18n.saved.replace("{name}", updated.name), "success");
  });

  root.querySelector<HTMLFormElement>("#client-add-contact-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const form = e.currentTarget as HTMLFormElement;
    const fd = new FormData(form);
    const contact: ContactPerson = {
      id: `con-${Date.now().toString(36)}`,
      name: String(fd.get("name") || "").trim(),
      role: String(fd.get("role") || "").trim() || undefined,
      email: String(fd.get("email") || "").trim() || undefined,
      phone: String(fd.get("phone") || "").trim() || undefined,
      isPrimary: fd.get("isPrimary") === "on",
    };
    if (!contact.name) return;
    await store.addClientContact(client.id, contact);
    showToast(i18n.contactAdded.replace("{name}", contact.name), "success");
  });

  root.querySelectorAll<HTMLButtonElement>(".client-delete-contact").forEach(btn => {
    btn.addEventListener("click", async () => {
      const contactId = btn.dataset.contactId;
      if (!contactId) return;
      await store.deleteClientContact(client.id, contactId);
      showToast(i18n.contactDeleted, "info");
    });
  });

  root.querySelector<HTMLFormElement>("#client-add-project-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const form = e.currentTarget as HTMLFormElement;
    const fd = new FormData(form);
    const name = String(fd.get("name") || "").trim();
    if (!name) return;
    const code = (String(fd.get("code") || "").trim() || deriveCodeFromName(name)).toUpperCase();
    const project: Project = {
      id: `prj-${Date.now().toString(36)}`,
      clientId: client.id,
      name,
      code,
      color: client.color,
    };
    await store.addProject(project);
    showToast(i18n.projectAdded.replace("{name}", name), "success");
  });
}

function escapeHtml(text: string): string {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function escapeAttr(text: string): string {
  return escapeHtml(text).replace(/"/g, "&quot;");
}
