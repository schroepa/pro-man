import { store, deriveCodeFromName } from "../storage/store";
import { TablerIcon } from "../components/icons";
import { Client, Project, ContactPerson } from "../types/client";
import { ColumnDefinition } from "../types/task";
import { themeManager, PRESET_THEMES, ThemeConfig } from "../storage/theme-manager";
import { calculateConcentricRadius } from "../utils/squircle";
import { showToast } from "../components/toast";

type BackofficeTab = "clients" | "theme";
let currentTab: BackofficeTab = "clients";
let feedbackMessage: string | null = null;
let editingClientId: string | null = null;

export function renderBackofficeView(container: HTMLElement): void {
  container.innerHTML = "";

  const clients = store.getClients();
  const allProjects = store.getProjects();
  const allTasks = store.getTasks();
  const allDocs = store.getDocs();
  const activeTheme = themeManager.getCurrentTheme();

  const wrapper = document.createElement("div");
  wrapper.className = "backoffice-container";
  wrapper.setAttribute("role", "region");
  wrapper.setAttribute("aria-label", "Backoffice & Verwaltung");

  wrapper.innerHTML = `
    <!-- Header -->
    <div class="backoffice-header">
      <div class="backoffice-title-group">
        <div class="backoffice-icon-badge">
          ${currentTab === "clients" ? TablerIcon.buildingStore({ size: 22, strokeWidth: 2 }) : TablerIcon.palette({ size: 22, strokeWidth: 2 })}
        </div>
        <div>
          <h1 class="backoffice-title">${currentTab === "clients" ? "Backoffice & Verwaltung" : "Farbsystem & Tintfield Manager"}</h1>
          <p class="backoffice-subtitle">${currentTab === "clients" ? "Zentrale Kunden- & Projektorganisation (synchronisiert mit clients.json)" : "12-stufige Farbskalen (Neutrals & Brand) mit Live-Anwendung & Tintfield-Import"}</p>
        </div>
      </div>
      <div style="display: flex; align-items: center; gap: var(--space-2);">
        ${currentTab === "clients" ? `
          <button id="toggle-new-client-btn" class="btn btn-primary">
            ${TablerIcon.plus({ size: 14, strokeWidth: 2.5 })}
            <span>Neuen Kunden anlegen</span>
          </button>
        ` : `
          <a href="https://tintfield.ptrckschrdtr.de/app" target="_blank" rel="noopener noreferrer" class="btn btn-secondary" style="text-decoration: none;">
            ${TablerIcon.externalLink({ size: 14, strokeWidth: 2 })}
            <span>Tintfield App öffnen</span>
          </a>
          <button id="header-reset-theme-btn" class="btn btn-ghost" title="Auf Standard Warm Obsidian zurücksetzen">
            ${TablerIcon.refresh({ size: 14, strokeWidth: 2 })}
            <span>Standard wiederherstellen</span>
          </button>
        `}
      </div>
    </div>

    <!-- Sub-Navigation Tabs -->
    <div class="backoffice-tab-nav" role="tablist" aria-label="Backoffice Bereiche">
      <button class="backoffice-tab-btn ${currentTab === "clients" ? "active" : ""}" data-tab="clients" role="tab" aria-selected="${currentTab === "clients"}">
        ${TablerIcon.users({ size: 14, strokeWidth: 2 })}
        <span>Kunden & Organisation</span>
      </button>
      <button class="backoffice-tab-btn ${currentTab === "theme" ? "active" : ""}" data-tab="theme" role="tab" aria-selected="${currentTab === "theme"}">
        ${TablerIcon.palette({ size: 14, strokeWidth: 2 })}
        <span>Farbsystem & Tintfield</span>
      </button>
    </div>

    ${currentTab === "clients" ? renderClientsTabHTML(clients, allProjects, allTasks, allDocs) : renderThemeTabHTML(activeTheme)}
  `;

  // Attach Sub-Tab Navigation
  wrapper.querySelectorAll<HTMLButtonElement>(".backoffice-tab-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const tab = btn.dataset.tab as BackofficeTab;
      if (tab && tab !== currentTab) {
        currentTab = tab;
        feedbackMessage = null;
        renderBackofficeView(container);
      }
    });
  });

  if (currentTab === "clients") {
    attachClientsEventListeners(wrapper, container);
  } else {
    attachThemeEventListeners(wrapper, container);
  }

  container.appendChild(wrapper);
}

function renderClientsTabHTML(
  clients: Client[],
  allProjects: Project[],
  allTasks: any[],
  allDocs: any[]
): string {
  return `
    <!-- Metrics with Operational Context -->
    <div class="backoffice-metrics-grid">
      <div class="metric-card">
        <div class="metric-header">
          <span class="metric-label">Kunden</span>
          <span class="metric-icon-badge">${TablerIcon.users({ size: 14 })}</span>
        </div>
        <span class="metric-value">${clients.length}</span>
        <span class="metric-subtext">Aktive Auftraggeber</span>
      </div>
      <div class="metric-card">
        <div class="metric-header">
          <span class="metric-label">Projekte</span>
          <span class="metric-icon-badge">${TablerIcon.briefcase({ size: 14 })}</span>
        </div>
        <span class="metric-value">${allProjects.length}</span>
        <span class="metric-subtext">Laufende Vorhaben</span>
      </div>
      <div class="metric-card">
        <div class="metric-header">
          <span class="metric-label">Aufgaben</span>
          <span class="metric-icon-badge">${TablerIcon.layoutKanban({ size: 14 })}</span>
        </div>
        <span class="metric-value">${allTasks.length}</span>
        <span class="metric-subtext">Gesamter Workload</span>
      </div>
      <div class="metric-card">
        <div class="metric-header">
          <span class="metric-label">Dokumente</span>
          <span class="metric-icon-badge">${TablerIcon.fileText({ size: 14 })}</span>
        </div>
        <span class="metric-value">${allDocs.length}</span>
        <span class="metric-subtext">Wissensbasis & Briefings</span>
      </div>
    </div>

    <!-- New Client Collapsible Card -->
    <div id="new-client-panel" class="backoffice-card" style="display: none;">
      <h2 style="font-size: var(--font-size-sm); font-weight: var(--font-weight-semibold); margin-bottom: var(--space-3);">
        Neuen Kunden erfassen
      </h2>
      <form id="create-client-form">
        <div class="form-row-2">
          <div class="form-group">
            <label class="form-label" for="bo-client-name">Kundenname</label>
            <input type="text" id="bo-client-name" class="input" required placeholder="z. B. Innovate Corp" />
          </div>
          <div class="form-row-2">
            <div class="form-group">
              <label class="form-label" for="bo-client-code">Kürzel (Tag)</label>
              <input type="text" id="bo-client-code" class="input" required maxlength="4" placeholder="INN" />
            </div>
            <div class="form-group">
              <label class="form-label" for="bo-client-color">Farbe</label>
              <input type="color" id="bo-client-color" class="input" value="#4f46e5" style="height: 32px; padding: 2px;" />
            </div>
          </div>
        </div>
        <div class="form-row-2" style="margin-top: var(--space-2);">
          <div class="form-group">
            <label class="form-label" for="bo-client-website">Website</label>
            <input type="url" id="bo-client-website" class="input" placeholder="https://…" />
          </div>
          <div class="form-group">
            <label class="form-label" for="bo-client-email">E-Mail</label>
            <input type="email" id="bo-client-email" class="input" placeholder="kontakt@…" />
          </div>
        </div>
        <div class="form-row-2" style="margin-top: var(--space-2);">
          <div class="form-group">
            <label class="form-label" for="bo-client-phone">Telefon</label>
            <input type="tel" id="bo-client-phone" class="input" placeholder="+49 …" />
          </div>
          <div class="form-group">
            <label class="form-label" for="bo-client-industry">Branche</label>
            <input type="text" id="bo-client-industry" class="input" placeholder="z. B. SaaS" />
          </div>
        </div>
        <div class="form-row-2" style="margin-top: var(--space-2);">
          <div class="form-group">
            <label class="form-label" for="bo-client-address">Adresse</label>
            <input type="text" id="bo-client-address" class="input" placeholder="Straße, PLZ Ort" />
          </div>
          <div class="form-group">
            <label class="form-label" for="bo-client-taxid">USt-IdNr.</label>
            <input type="text" id="bo-client-taxid" class="input" placeholder="DE…" />
          </div>
        </div>
        <div class="form-group" style="margin-top: var(--space-2);">
          <label class="form-label" for="bo-client-desc">Beschreibung</label>
          <input type="text" id="bo-client-desc" class="input" placeholder="Kurzbeschreibung…" />
        </div>
        <div class="form-group" style="margin-top: var(--space-2);">
          <label class="form-label" for="bo-client-notes">Notizen</label>
          <textarea id="bo-client-notes" class="textarea" rows="2" placeholder="Interne Notizen…"></textarea>
        </div>
        <div style="display: flex; justify-content: flex-end; gap: var(--space-2); margin-top: var(--space-3);">
          <button type="button" id="cancel-new-client-btn" class="btn btn-secondary">Abbrechen</button>
          <button type="submit" class="btn btn-primary">Kunde speichern</button>
        </div>
      </form>
    </div>

    <!-- Clients List -->
    <div class="backoffice-section">
      <div class="section-header-row">
        <h2 class="section-heading">Erfasste Kunden (${clients.length})</h2>
      </div>

      <div class="client-list-grid">
        ${clients.map(client => {
          const clientProjects = store.getProjects(client.id);
          const clientTasks = allTasks.filter(t => t.clientId === client.id);
          const clientDocs = allDocs.filter(d => d.clientId === client.id);
          const isEditing = editingClientId === client.id;
          const contacts = client.contacts || [];

          return `
            <div class="client-mgmt-card" data-client-id="${client.id}">
              <div class="client-mgmt-header">
                <div class="client-info-left">
                  <span class="client-color-pill" style="background-color: ${client.color};"></span>
                  <div>
                    <div style="display: flex; align-items: center; gap: var(--space-2);">
                      <h3 class="client-mgmt-name">${escapeHtml(client.name)}</h3>
                      <span class="client-mgmt-code">${escapeHtml(client.code)}</span>
                    </div>
                    ${client.description ? `<p style="font-size: var(--font-size-xs); color: var(--color-text-muted);">${escapeHtml(client.description)}</p>` : ""}
                    <div class="client-meta-row">
                      ${client.website ? `<span>${escapeHtml(client.website)}</span>` : ""}
                      ${client.email ? `<span>${escapeHtml(client.email)}</span>` : ""}
                      ${client.phone ? `<span>${escapeHtml(client.phone)}</span>` : ""}
                      ${client.industry ? `<span>${escapeHtml(client.industry)}</span>` : ""}
                    </div>
                  </div>
                </div>

                <div style="display: flex; align-items: center; gap: var(--space-2);">
                  <div style="font-size: var(--font-size-xs); color: var(--color-text-muted); display: flex; gap: var(--space-3);">
                    <span>${clientTasks.length} Tasks</span>
                    <span>•</span>
                    <span>${clientDocs.length} Docs</span>
                  </div>
                  <button class="btn btn-ghost edit-client-btn" data-client-id="${client.id}" style="padding: 4px 8px; font-size: var(--font-size-xs);" title="Kunde bearbeiten">
                    ${TablerIcon.pencil({ size: 14 })}
                    <span>${isEditing ? "Schließen" : "Bearbeiten"}</span>
                  </button>
                  <button class="btn btn-ghost-danger delete-client-btn" data-client-id="${client.id}" style="padding: 4px 8px; font-size: var(--font-size-xs);" title="Kunde löschen">
                    ${TablerIcon.trash({ size: 14 })}
                    <span>Löschen</span>
                  </button>
                </div>
              </div>

              ${isEditing ? `
                <form class="edit-client-form" data-client-id="${client.id}">
                  <div class="form-row-2">
                    <div class="form-group">
                      <label class="form-label">Kundenname</label>
                      <input type="text" name="name" class="input" required value="${escapeHtml(client.name)}" />
                    </div>
                    <div class="form-row-2">
                      <div class="form-group">
                        <label class="form-label">Kürzel</label>
                        <input type="text" name="code" class="input" required maxlength="4" value="${escapeHtml(client.code)}" />
                      </div>
                      <div class="form-group">
                        <label class="form-label">Farbe</label>
                        <input type="color" name="color" class="input" value="${escapeHtml(client.color)}" style="height: 32px; padding: 2px;" />
                      </div>
                    </div>
                  </div>
                  <div class="form-row-2" style="margin-top: var(--space-2);">
                    <div class="form-group">
                      <label class="form-label">Website</label>
                      <input type="url" name="website" class="input" value="${escapeHtml(client.website || "")}" />
                    </div>
                    <div class="form-group">
                      <label class="form-label">E-Mail</label>
                      <input type="email" name="email" class="input" value="${escapeHtml(client.email || "")}" />
                    </div>
                  </div>
                  <div class="form-row-2" style="margin-top: var(--space-2);">
                    <div class="form-group">
                      <label class="form-label">Telefon</label>
                      <input type="tel" name="phone" class="input" value="${escapeHtml(client.phone || "")}" />
                    </div>
                    <div class="form-group">
                      <label class="form-label">Branche</label>
                      <input type="text" name="industry" class="input" value="${escapeHtml(client.industry || "")}" />
                    </div>
                  </div>
                  <div class="form-row-2" style="margin-top: var(--space-2);">
                    <div class="form-group">
                      <label class="form-label">Adresse</label>
                      <input type="text" name="address" class="input" value="${escapeHtml(client.address || "")}" />
                    </div>
                    <div class="form-group">
                      <label class="form-label">USt-IdNr.</label>
                      <input type="text" name="taxId" class="input" value="${escapeHtml(client.taxId || "")}" />
                    </div>
                  </div>
                  <div class="form-group" style="margin-top: var(--space-2);">
                    <label class="form-label">Beschreibung</label>
                    <input type="text" name="description" class="input" value="${escapeHtml(client.description || "")}" />
                  </div>
                  <div class="form-group" style="margin-top: var(--space-2);">
                    <label class="form-label">Notizen</label>
                    <textarea name="notes" class="textarea" rows="2">${escapeHtml(client.notes || "")}</textarea>
                  </div>
                  <div style="display: flex; justify-content: flex-end; margin-top: var(--space-3);">
                    <button type="submit" class="btn btn-primary">Änderungen speichern</button>
                  </div>
                </form>
              ` : ""}

              <!-- Contacts -->
              <div class="client-contacts-box">
                <div class="projects-box-header">
                  <span>Ansprechpartner (${contacts.length})</span>
                </div>
                <div class="contacts-list">
                  ${contacts.map(contact => `
                    <div class="contact-row" data-contact-id="${contact.id}">
                      <div class="contact-info">
                        <strong>${escapeHtml(contact.name)}</strong>
                        ${contact.isPrimary ? `<span class="contact-primary-badge">Primary</span>` : ""}
                        ${contact.role ? `<span class="contact-meta">${escapeHtml(contact.role)}</span>` : ""}
                        ${contact.email ? `<span class="contact-meta">${escapeHtml(contact.email)}</span>` : ""}
                        ${contact.phone ? `<span class="contact-meta">${escapeHtml(contact.phone)}</span>` : ""}
                      </div>
                      <button type="button" class="btn btn-ghost delete-contact-btn" data-client-id="${client.id}" data-contact-id="${contact.id}" title="Kontakt löschen" style="padding: 2px 6px;">
                        ${TablerIcon.x({ size: 12 })}
                      </button>
                    </div>
                  `).join("") || `<p class="contacts-empty">Noch keine Kontakte.</p>`}
                </div>
                <form class="add-contact-form" data-client-id="${client.id}">
                  <input type="text" name="name" class="input" placeholder="Name" required style="max-width: 140px;" />
                  <input type="text" name="role" class="input" placeholder="Rolle" style="max-width: 120px;" />
                  <input type="email" name="email" class="input" placeholder="E-Mail" style="max-width: 160px;" />
                  <input type="tel" name="phone" class="input" placeholder="Telefon" style="max-width: 120px;" />
                  <label class="contact-primary-check" title="Primary">
                    <input type="checkbox" name="isPrimary" />
                    <span>Primary</span>
                  </label>
                  <button type="submit" class="btn btn-secondary" style="font-size: var(--font-size-xs);">
                    ${TablerIcon.plus({ size: 12 })}
                    <span>Kontakt</span>
                  </button>
                </form>
              </div>

              <!-- Projects Section for this Client -->
              <div class="client-projects-box">
                <div class="projects-box-header">
                  <span>Zugeordnete Projekte (${clientProjects.length})</span>
                </div>

                <div class="project-chips-list">
                  ${clientProjects.map(prj => `
                    <div class="project-mgmt-chip" data-project-id="${prj.id}">
                      <form class="rename-project-form" data-project-id="${prj.id}">
                        <input type="text" class="input project-rename-input" value="${escapeHtml(prj.name)}" aria-label="Projekt umbenennen" required />
                        <input type="text" class="input project-code-input" value="${escapeHtml(prj.code || "")}" maxlength="6" placeholder="Kürzel" aria-label="Projektkürzel" title="Projektkürzel (z. B. WEB)" style="width: 72px; text-transform: uppercase;" />
                        <button type="submit" class="btn btn-ghost" title="Speichern" style="width: 20px; height: 20px; padding: 0; min-height: auto;">
                          ${TablerIcon.pencil({ size: 11 })}
                        </button>
                      </form>
                      <button class="btn btn-ghost delete-project-btn" data-project-id="${prj.id}" style="width: 16px; height: 16px; padding: 0; min-height: auto;" title="Projekt entfernen">
                        ${TablerIcon.x({ size: 12 })}
                      </button>
                    </div>
                    <div class="project-statuses-editor" data-project-id="${prj.id}">
                      <label class="form-label" style="font-size: 0.6875rem;">Status-Spalten (eine Zeile: id|Name|WIP)</label>
                      <textarea class="textarea project-statuses-textarea" rows="3" placeholder="todo|Zu erledigen|5&#10;in-progress|In Bearbeitung|3&#10;done|Erledigt">${escapeHtml(formatProjectStatuses(prj))}</textarea>
                      <button type="button" class="btn btn-secondary save-project-statuses-btn" data-project-id="${prj.id}" style="font-size: var(--font-size-xs); align-self: flex-start;">
                        Status speichern
                      </button>
                    </div>
                  `).join("")}
                </div>

                <form class="add-project-inline-form" data-client-id="${client.id}">
                  <input type="text" class="input new-project-title-input" placeholder="Neues Projekt für ${escapeHtml(client.name)} hinzufügen..." style="max-width: 280px;" required />
                  <input type="text" class="input new-project-code-input" maxlength="6" placeholder="Kürzel" title="Projektkürzel" style="width: 72px; text-transform: uppercase;" />
                  <button type="submit" class="btn btn-secondary" style="font-size: var(--font-size-xs);">
                    ${TablerIcon.plus({ size: 12 })}
                    <span>Hinzufügen</span>
                  </button>
                </form>
              </div>
            </div>
          `;
        }).join("")}
      </div>
    </div>
  `;
}

function renderThemeTabHTML(activeTheme: ThemeConfig): string {
  return `
    <div class="theme-manager-container">
      ${feedbackMessage ? `
        <div class="theme-feedback-banner">
          ${TablerIcon.circleCheck({ size: 16, strokeWidth: 2 })}
          <span>${escapeHtml(feedbackMessage)}</span>
        </div>
      ` : ""}

      <!-- Preset Themes Section -->
      <div class="backoffice-section">
        <div class="section-header-row">
          <div>
            <h2 class="section-heading">Kuratierte Theme-Presets</h2>
            <p style="font-size: var(--font-size-xs); color: var(--color-text-muted);">
              Wähle eine harmonische Farbpalette aus 12-stufigen Neutrals & Brand-Tönen (Warm Obsidian, Slate Indigo, Forest Sage, Nordic Amber).
            </p>
          </div>
        </div>

        <div class="theme-presets-grid">
          ${Object.values(PRESET_THEMES).map(preset => {
            const isActive = preset.name === activeTheme.name;
            return `
              <div class="theme-preset-card ${isActive ? "active" : ""}" data-preset-id="${preset.id}">
                <div class="theme-preset-header">
                  <span class="theme-preset-name">${escapeHtml(preset.name)}</span>
                  ${isActive ? `
                    <span class="badge" style="background-color: var(--brand-3); color: var(--brand-11); font-size: 0.625rem; font-weight: var(--font-weight-semibold); padding: 2px 6px;">
                      Aktiv
                    </span>
                  ` : ""}
                </div>
                <p class="theme-preset-desc">${escapeHtml(preset.description)}</p>
                
                <!-- 12-Step Neutral Swatch -->
                <div style="display: flex; flex-direction: column; gap: 4px; margin-top: var(--space-1);">
                  <span style="font-size: 0.5625rem; text-transform: uppercase; color: var(--color-text-muted); font-weight: var(--font-weight-semibold); letter-spacing: 0.05em;">Neutrals</span>
                  <div class="theme-swatch-row">
                    ${Array.from({ length: 12 }, (_, i) => i + 1).map(step => `
                      <div class="theme-swatch-cell" style="background-color: ${preset.neutral[step]};" title="Neutral ${step}: ${preset.neutral[step]}"></div>
                    `).join("")}
                  </div>
                </div>

                <!-- 12-Step Brand Swatch -->
                <div style="display: flex; flex-direction: column; gap: 4px;">
                  <span style="font-size: 0.5625rem; text-transform: uppercase; color: var(--color-text-muted); font-weight: var(--font-weight-semibold); letter-spacing: 0.05em;">Brand Accent</span>
                  <div class="theme-swatch-row">
                    ${Array.from({ length: 12 }, (_, i) => i + 1).map(step => `
                      <div class="theme-swatch-cell" style="background-color: ${preset.brand[step]};" title="Brand ${step}: ${preset.brand[step]}"></div>
                    `).join("")}
                  </div>
                </div>
              </div>
            `;
          }).join("")}
        </div>
      </div>

      <!-- Live 12-Step Scale Visualizer -->
      <div class="theme-scale-preview">
        <div style="display: flex; align-items: center; justify-content: space-between;">
          <span class="theme-scale-preview-title">Aktive 12-stufige Farbskalen (Live Tokens)</span>
          <span style="font-size: var(--font-size-xs); color: var(--color-text-muted);">
            Aktives Theme: <strong>${escapeHtml(activeTheme.name)}</strong>
          </span>
        </div>

        <div style="display: flex; flex-direction: column; gap: var(--space-3); margin-top: var(--space-1);">
          <!-- Neutrals -->
          <div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
              <span style="font-size: 0.6875rem; font-weight: var(--font-weight-medium); color: var(--color-text-secondary);">
                Neutrals (1: Canvas → 6: Border Subtil → 9: Text Gedämpft → 12: Hoher Kontrast)
              </span>
            </div>
            <div class="theme-scale-steps">
              ${Array.from({ length: 12 }, (_, i) => i + 1).map(step => `
                <div class="theme-scale-step-item">
                  <div class="theme-scale-step-box" style="background-color: var(--neutral-${step});" title="--neutral-${step}"></div>
                  <span class="theme-scale-step-num">${step}</span>
                </div>
              `).join("")}
            </div>
          </div>

          <!-- Brand -->
          <div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
              <span style="font-size: 0.6875rem; font-weight: var(--font-weight-medium); color: var(--color-text-secondary);">
                Brand Accent (1: Subtiler Tint → 3: Badges → 9: Primäre Buttons / CTA → 12: Kontrasttext)
              </span>
            </div>
            <div class="theme-scale-steps">
              ${Array.from({ length: 12 }, (_, i) => i + 1).map(step => `
                <div class="theme-scale-step-item">
                  <div class="theme-scale-step-box" style="background-color: var(--brand-${step});" title="--brand-${step}"></div>
                  <span class="theme-scale-step-num">${step}</span>
                </div>
              `).join("")}
            </div>
          </div>
        </div>
      </div>

      <!-- Apple Squircle & Concentric Radii Geometry Showcase -->
      <div class="geometry-showcase-box">
        <div style="display: flex; align-items: flex-start; justify-content: space-between; gap: var(--space-4); flex-wrap: wrap;">
          <div>
            <h3 style="font-size: var(--font-size-sm); font-weight: var(--font-weight-semibold); color: var(--color-text-primary);">
              Apple Squircles & Konzentrische Ecken-Geometrie
            </h3>
            <p style="font-size: var(--font-size-xs); color: var(--color-text-muted); margin-top: 2px;">
              Keine plumpen Kreisbögen: Wir nutzen <strong>G2 Curvature Continuity (Apple Superellipsen mit 60% Smoothing)</strong> und die mathematische Formel für verschachtelte Ecken: <code style="font-family: var(--font-family-mono); font-size: 0.6875rem;">R_inner = max(0, R_outer - Padding)</code>.
            </p>
          </div>
          <span class="badge" style="background-color: var(--brand-3); color: var(--brand-11); font-size: 0.625rem; font-weight: var(--font-weight-semibold); padding: 4px 8px;">
            G2 Curvature Active
          </span>
        </div>

        <div class="geometry-controls-row">
          <div class="geometry-control-group">
            <label class="geometry-control-label" for="slider-outer-radius">Äußerer Radius:</label>
            <input type="range" id="slider-outer-radius" class="geometry-slider" min="10" max="40" value="22" />
            <span id="label-outer-radius" style="font-family: var(--font-family-mono); font-size: var(--font-size-xs); font-weight: var(--font-weight-semibold); min-width: 32px;">22px</span>
          </div>

          <div class="geometry-control-group">
            <label class="geometry-control-label" for="slider-padding">Innenabstand (Padding):</label>
            <input type="range" id="slider-padding" class="geometry-slider" min="4" max="24" value="12" />
            <span id="label-padding" style="font-family: var(--font-family-mono); font-size: var(--font-size-xs); font-weight: var(--font-weight-semibold); min-width: 32px;">12px</span>
          </div>

          <div style="margin-left: auto; font-size: var(--font-size-xs); color: var(--color-text-primary); font-family: var(--font-family-mono); background-color: var(--color-bg-surface); padding: 4px 10px; border-radius: var(--radius-xs);">
            Berechneter Innenradius: <strong id="label-calculated-inner" style="color: var(--color-primary-600);">10px</strong>
          </div>
        </div>

        <div class="geometry-preview-grid">
          <!-- Unharmonisch: Falsch -->
          <div class="geometry-demo-card">
            <div style="display: flex; align-items: center; justify-content: space-between; width: 100%;">
              <span class="geometry-demo-title">Ungewollt (Gleicher Radius)</span>
              <span class="geometry-demo-badge" style="background-color: #fee2e2; color: #991b1b;">Eck-Dissonanz</span>
            </div>
            <div id="demo-wrong-outer" class="geometry-outer-box" style="width: 100%; max-width: 280px; height: 130px; padding: 12px; border-radius: 22px;">
              <div id="demo-wrong-inner" class="geometry-inner-box" style="border-radius: 22px;">
                <span>Optischer Wulst in Ecken</span>
              </div>
            </div>
            <span id="demo-wrong-desc" style="font-size: 0.625rem; color: var(--color-text-muted); text-align: center;">
              R_inner = 22px (Diagonaler Abstand ungleichmäßig)
            </span>
          </div>

          <!-- Harmonisch: Konzentrisch + Apple Squircle -->
          <div class="geometry-demo-card">
            <div style="display: flex; align-items: center; justify-content: space-between; width: 100%;">
              <span class="geometry-demo-title">ProMan Standard (Konzentrisch + Squircle)</span>
              <span class="geometry-demo-badge" style="background-color: #dcfce7; color: #166534;">100% Organisch</span>
            </div>
            <div id="demo-right-outer" class="geometry-outer-box" style="width: 100%; max-width: 280px; height: 130px; padding: 12px; border-radius: 22px;">
              <div id="demo-right-inner" class="geometry-inner-box" style="border-radius: 10px;">
                <span>Konstante Padding-Geometrie</span>
              </div>
            </div>
            <span id="demo-right-desc" style="font-size: 0.625rem; color: var(--color-text-muted); text-align: center;">
              R_inner = max(0, 22px - 12px) = <strong>10px</strong>
            </span>
          </div>
        </div>
      </div>

      <!-- Tintfield Code Import & Export -->
      <div class="theme-code-editor-box">
        <div style="display: flex; align-items: flex-start; justify-content: space-between; gap: var(--space-4);">
          <div>
            <h3 style="font-size: var(--font-size-sm); font-weight: var(--font-weight-semibold); color: var(--color-text-primary);">
              Tintfield CSS & JSON Editor
            </h3>
            <p style="font-size: var(--font-size-xs); color: var(--color-text-muted); margin-top: 2px;">
              Füge hier exportierte CSS-Variablen (<code style="font-family: var(--font-family-mono); font-size: 0.6875rem;">--neutral-1..12</code>, <code style="font-family: var(--font-family-mono); font-size: 0.6875rem;">--brand-1..12</code>) oder Tintfield-JSON direkt ein. Änderungen werden sofort in der gesamten Benutzeroberfläche aktiviert und gespeichert.
            </p>
          </div>
          <a href="https://tintfield.ptrckschrdtr.de/app" target="_blank" rel="noopener noreferrer" class="btn btn-secondary" style="font-size: var(--font-size-xs); white-space: nowrap; text-decoration: none;">
            ${TablerIcon.sparkles({ size: 14 })}
            <span>In Tintfield entwerfen</span>
          </a>
        </div>

        <textarea id="theme-css-input" class="theme-textarea" spellcheck="false" placeholder="/* CSS Custom Properties oder Tintfield JSON hier einfügen... */">${escapeHtml(themeManager.exportCSS(activeTheme))}</textarea>

        <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: var(--space-3);">
          <div style="display: flex; align-items: center; gap: var(--space-2);">
            <button id="apply-theme-css-btn" class="btn btn-primary">
              ${TablerIcon.sparkles({ size: 14, strokeWidth: 2.5 })}
              <span>Aus Tintfield anwenden</span>
            </button>
            <button id="copy-theme-css-btn" class="btn btn-secondary">
              ${TablerIcon.copy({ size: 14, strokeWidth: 2 })}
              <span>CSS kopieren</span>
            </button>
          </div>

          <button id="reset-theme-btn" class="btn btn-ghost" title="Standard Warm Obsidian Theme zurücksetzen">
            ${TablerIcon.refresh({ size: 14, strokeWidth: 2 })}
            <span>Zurücksetzen auf Warm Obsidian</span>
          </button>
        </div>
      </div>
    </div>
  `;
}

function attachClientsEventListeners(wrapper: HTMLElement, container: HTMLElement): void {
  const newClientPanel = wrapper.querySelector<HTMLElement>("#new-client-panel")!;
  const toggleBtn = wrapper.querySelector("#toggle-new-client-btn");
  const cancelBtn = wrapper.querySelector("#cancel-new-client-btn");

  if (toggleBtn && newClientPanel) {
    toggleBtn.addEventListener("click", () => {
      newClientPanel.style.display = newClientPanel.style.display === "none" ? "block" : "none";
      if (newClientPanel.style.display === "block") {
        (wrapper.querySelector("#bo-client-name") as HTMLInputElement)?.focus();
      }
    });
  }

  if (cancelBtn && newClientPanel) {
    cancelBtn.addEventListener("click", () => {
      newClientPanel.style.display = "none";
    });
  }

  const createForm = wrapper.querySelector<HTMLFormElement>("#create-client-form");
  if (createForm) {
    createForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const name = (wrapper.querySelector("#bo-client-name") as HTMLInputElement).value.trim();
      const code = (wrapper.querySelector("#bo-client-code") as HTMLInputElement).value.trim().toUpperCase();
      const color = (wrapper.querySelector("#bo-client-color") as HTMLInputElement).value;
      const description = (wrapper.querySelector("#bo-client-desc") as HTMLInputElement).value.trim();
      const website = (wrapper.querySelector("#bo-client-website") as HTMLInputElement).value.trim() || undefined;
      const email = (wrapper.querySelector("#bo-client-email") as HTMLInputElement).value.trim() || undefined;
      const phone = (wrapper.querySelector("#bo-client-phone") as HTMLInputElement).value.trim() || undefined;
      const industry = (wrapper.querySelector("#bo-client-industry") as HTMLInputElement).value.trim() || undefined;
      const address = (wrapper.querySelector("#bo-client-address") as HTMLInputElement).value.trim() || undefined;
      const taxId = (wrapper.querySelector("#bo-client-taxid") as HTMLInputElement).value.trim() || undefined;
      const notes = (wrapper.querySelector("#bo-client-notes") as HTMLTextAreaElement).value.trim() || undefined;

      const newClient: Client = {
        id: `cli-${Date.now().toString(36)}`,
        name,
        code,
        color,
        description,
        website,
        email,
        phone,
        industry,
        address,
        taxId,
        notes,
        contacts: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await store.addClient(newClient);
      showToast(`Kunde "${name}" angelegt`, "success");
      renderBackofficeView(container);
    });
  }

  wrapper.querySelectorAll<HTMLButtonElement>(".edit-client-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const cId = btn.dataset.clientId || null;
      editingClientId = editingClientId === cId ? null : cId;
      renderBackofficeView(container);
    });
  });

  wrapper.querySelectorAll<HTMLFormElement>(".edit-client-form").forEach(form => {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const clientId = form.dataset.clientId;
      const existing = clientId ? store.getClient(clientId) : undefined;
      if (!existing || !clientId) return;

      const fd = new FormData(form);
      const updated: Client = {
        ...existing,
        name: String(fd.get("name") || "").trim(),
        code: String(fd.get("code") || "").trim().toUpperCase(),
        color: String(fd.get("color") || existing.color),
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

      await store.updateClient(updated);
      editingClientId = null;
      showToast(`Kunde "${updated.name}" gespeichert`, "success");
      renderBackofficeView(container);
    });
  });

  wrapper.querySelectorAll<HTMLFormElement>(".add-contact-form").forEach(form => {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const clientId = form.dataset.clientId;
      if (!clientId) return;
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
      await store.addClientContact(clientId, contact);
      showToast(`Kontakt "${contact.name}" hinzugefügt`, "success");
      renderBackofficeView(container);
    });
  });

  wrapper.querySelectorAll<HTMLFormElement>(".rename-project-form").forEach(form => {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      e.stopPropagation();
      const projectId = form.dataset.projectId;
      const existing = projectId ? store.getProject(projectId) : undefined;
      const input = form.querySelector<HTMLInputElement>(".project-rename-input");
      const codeInput = form.querySelector<HTMLInputElement>(".project-code-input");
      const name = input?.value.trim();
      const code = (codeInput?.value.trim() || deriveCodeFromName(name)).toUpperCase();
      if (!existing || !name) return;
      await store.updateProject({ ...existing, name, code });
      showToast(`Projekt gespeichert: ${name}`, "success");
      renderBackofficeView(container);
    });
  });

  wrapper.addEventListener("click", async (e) => {
    const target = e.target as HTMLElement;

    const delContactBtn = target.closest<HTMLElement>(".delete-contact-btn");
    if (delContactBtn) {
      const cId = delContactBtn.dataset.clientId;
      const contactId = delContactBtn.dataset.contactId;
      if (cId && contactId) {
        await store.deleteClientContact(cId, contactId);
        showToast("Kontakt gelöscht", "info");
        renderBackofficeView(container);
      }
      return;
    }

    const delClientBtn = target.closest<HTMLElement>(".delete-client-btn");
    if (delClientBtn) {
      const cId = delClientBtn.dataset.clientId;
      const client = store.getClient(cId || "");
      if (client) {
        const result = await store.deleteClient(client.id);
        if (!result.ok) {
          const cascade = confirm(`Kunde "${client.name}" hat verknüpfte Daten (${result.blockedBy}). Mit allen Aufgaben/Docs löschen?`);
          if (cascade) {
            await store.deleteClient(client.id, { cascade: true });
          } else {
            return;
          }
        }
        showToast(`Kunde "${client.name}" gelöscht`, "info");
        renderBackofficeView(container);
      }
      return;
    }

    const delPrjBtn = target.closest<HTMLElement>(".delete-project-btn");
    if (delPrjBtn) {
      const pId = delPrjBtn.dataset.projectId;
      const prj = store.getProject(pId || "");
      if (prj) {
        const result = await store.deleteProject(prj.id);
        if (!result.ok) {
          const cascade = confirm(`Projekt "${prj.name}" hat verknüpfte Daten (${result.blockedBy}). Mit allen Aufgaben/Docs löschen?`);
          if (cascade) {
            await store.deleteProject(prj.id, { cascade: true });
          } else {
            return;
          }
        }
        showToast(`Projekt "${prj.name}" gelöscht`, "info");
        renderBackofficeView(container);
      }
    }
  });

  wrapper.querySelectorAll<HTMLFormElement>(".add-project-inline-form").forEach(form => {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const clientId = form.dataset.clientId;
      const input = form.querySelector<HTMLInputElement>(".new-project-title-input");
      const codeInput = form.querySelector<HTMLInputElement>(".new-project-code-input");
      const name = input?.value.trim();
      if (clientId && name) {
        const code = (codeInput?.value.trim() || deriveCodeFromName(name)).toUpperCase();
        const newPrj: Project = {
          id: `prj-${Date.now().toString(36)}`,
          clientId,
          name,
          code,
        };
        await store.addProject(newPrj);
        showToast(`Projekt "${name}" angelegt`, "success");
        renderBackofficeView(container);
      }
    });
  });

  wrapper.querySelectorAll<HTMLButtonElement>(".save-project-statuses-btn").forEach(btn => {
    btn.addEventListener("click", async () => {
      const projectId = btn.dataset.projectId;
      const existing = projectId ? store.getProject(projectId) : undefined;
      if (!existing || !projectId) return;
      const editor = wrapper.querySelector<HTMLElement>(`.project-statuses-editor[data-project-id="${projectId}"]`);
      const textarea = editor?.querySelector<HTMLTextAreaElement>(".project-statuses-textarea");
      const statuses = parseProjectStatuses(textarea?.value || "");
      await store.updateProject({
        ...existing,
        statuses: statuses.length > 0 ? statuses : undefined,
      });
      showToast(statuses.length ? `Status für „${existing.name}" gespeichert` : `Standard-Status für „${existing.name}"`, "success");
      renderBackofficeView(container);
    });
  });
}

function attachThemeEventListeners(wrapper: HTMLElement, container: HTMLElement): void {
  // Preset Theme Cards
  wrapper.querySelectorAll<HTMLElement>(".theme-preset-card").forEach(card => {
    card.addEventListener("click", () => {
      const presetId = card.dataset.presetId;
      if (presetId) {
        const success = themeManager.applyPreset(presetId);
        if (success) {
          const preset = PRESET_THEMES[presetId];
          feedbackMessage = `Theme-Preset "${preset.name}" erfolgreich aktiviert!`;
          renderBackofficeView(container);
        }
      }
    });
  });

  // Apply Custom Tintfield CSS / JSON
  const applyBtn = wrapper.querySelector<HTMLButtonElement>("#apply-theme-css-btn");
  const textarea = wrapper.querySelector<HTMLTextAreaElement>("#theme-css-input");

  if (applyBtn && textarea) {
    applyBtn.addEventListener("click", () => {
      const inputVal = textarea.value;
      const parsedTheme = themeManager.parseTintfield(inputVal);
      if (parsedTheme) {
        themeManager.applyCustomTheme(parsedTheme);
        feedbackMessage = `Tintfield Farbsystem erfolgreich übernommen und live angewendet!`;
        renderBackofficeView(container);
      } else {
        showToast("Konnte keine gültigen 12-stufigen CSS-Variablen (--neutral-X, --brand-X) oder JSON-Werte erkennen. Bitte überprüfe das Format aus Tintfield.", "error");
      }
    });
  }

  // Copy CSS to Clipboard
  const copyBtn = wrapper.querySelector<HTMLButtonElement>("#copy-theme-css-btn");
  if (copyBtn && textarea) {
    copyBtn.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(textarea.value);
        feedbackMessage = "CSS-Variablen erfolgreich in die Zwischenablage kopiert!";
        renderBackofficeView(container);
      } catch {
        textarea.select();
        document.execCommand("copy");
        feedbackMessage = "CSS-Variablen in die Zwischenablage kopiert!";
        renderBackofficeView(container);
      }
    });
  }

  // Reset to Default Warm Obsidian
  const resetBtn = wrapper.querySelector<HTMLButtonElement>("#reset-theme-btn");
  const headerResetBtn = wrapper.querySelector<HTMLButtonElement>("#header-reset-theme-btn");

  const handleReset = () => {
    themeManager.resetToDefault();
    feedbackMessage = "Farbsystem auf Standard 'Warm Obsidian' zurückgesetzt.";
    renderBackofficeView(container);
  };

  if (resetBtn) resetBtn.addEventListener("click", handleReset);
  if (headerResetBtn) headerResetBtn.addEventListener("click", handleReset);

  // Interactive Squircle & Concentric Geometry Live Tester
  const sliderOuter = wrapper.querySelector<HTMLInputElement>("#slider-outer-radius");
  const sliderPad = wrapper.querySelector<HTMLInputElement>("#slider-padding");
  const labelOuter = wrapper.querySelector<HTMLElement>("#label-outer-radius");
  const labelPad = wrapper.querySelector<HTMLElement>("#label-padding");
  const labelCalcInner = wrapper.querySelector<HTMLElement>("#label-calculated-inner");
  const demoWrongOuter = wrapper.querySelector<HTMLElement>("#demo-wrong-outer");
  const demoWrongInner = wrapper.querySelector<HTMLElement>("#demo-wrong-inner");
  const demoWrongDesc = wrapper.querySelector<HTMLElement>("#demo-wrong-desc");
  const demoRightOuter = wrapper.querySelector<HTMLElement>("#demo-right-outer");
  const demoRightInner = wrapper.querySelector<HTMLElement>("#demo-right-inner");
  const demoRightDesc = wrapper.querySelector<HTMLElement>("#demo-right-desc");

  const updateGeometryDemo = () => {
    if (!sliderOuter || !sliderPad) return;
    const outerR = parseInt(sliderOuter.value, 10);
    const pad = parseInt(sliderPad.value, 10);
    const innerR = calculateConcentricRadius(outerR, pad);

    if (labelOuter) labelOuter.textContent = `${outerR}px`;
    if (labelPad) labelPad.textContent = `${pad}px`;
    if (labelCalcInner) labelCalcInner.textContent = `${innerR}px`;

    if (demoWrongOuter) {
      demoWrongOuter.style.padding = `${pad}px`;
      demoWrongOuter.style.borderRadius = `${outerR}px`;
    }
    if (demoWrongInner) {
      demoWrongInner.style.borderRadius = `${outerR}px`;
    }
    if (demoWrongDesc) {
      demoWrongDesc.textContent = `R_inner = ${outerR}px (Diagonaler Abstand ungleichmäßig)`;
    }

    if (demoRightOuter) {
      demoRightOuter.style.padding = `${pad}px`;
      demoRightOuter.style.borderRadius = `${outerR}px`;
    }
    if (demoRightInner) {
      demoRightInner.style.borderRadius = `${innerR}px`;
    }
    if (demoRightDesc) {
      demoRightDesc.innerHTML = `R_inner = max(0, ${outerR}px - ${pad}px) = <strong>${innerR}px</strong>`;
    }
  };

  sliderOuter?.addEventListener("input", updateGeometryDemo);
  sliderPad?.addEventListener("input", updateGeometryDemo);
}

function escapeHtml(text: string): string {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function formatProjectStatuses(project: Project): string {
  if (!project.statuses?.length) return "";
  return [...project.statuses]
    .sort((a, b) => a.order - b.order)
    .map(s => {
      const wip = typeof s.wipLimit === "number" ? `|${s.wipLimit}` : "";
      return `${s.id}|${s.name}${wip}`;
    })
    .join("\n");
}

/** Parse lines like `id|Name|WIP` into ColumnDefinition[]. Empty → []. */
function parseProjectStatuses(raw: string): ColumnDefinition[] {
  const lines = raw.split("\n").map(l => l.trim()).filter(Boolean);
  const result: ColumnDefinition[] = [];
  lines.forEach((line, index) => {
    const parts = line.split("|").map(p => p.trim());
    const id = parts[0];
    if (!id) return;
    const name = parts[1] || id;
    const wipRaw = parts[2];
    const wipLimit = wipRaw !== undefined && wipRaw !== "" && Number.isFinite(Number(wipRaw))
      ? Number(wipRaw)
      : undefined;
    result.push({
      id,
      name,
      color: "var(--color-text-muted)",
      order: index,
      wipLimit,
    });
  });
  return result;
}
