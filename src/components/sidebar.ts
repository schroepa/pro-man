import { store, getLastVaultNames } from "../storage/store";
import { t, getLanguage, setLanguage } from "../i18n";
import { announcer } from "../a11y/announcer";
import { TablerIcon } from "./icons";
import { showToast } from "./toast";
import { CustomSelect } from "./custom-select";
import { closeMobileSidebar, toggleSidebar } from "../storage/sidebar-layout";
import { isOnboarded } from "./onboarding-banner";

export function renderSidebar(container: HTMLElement): void {
  const sidebar = document.createElement("aside");
  sidebar.className = "app-sidebar";
  sidebar.setAttribute("aria-label", "Hauptnavigation");

  const connectionState = store.vault.connectionState;
  const isConnected = connectionState === "connected";
  const needsPermission = connectionState === "permission_needed";
  const isUnsupported = connectionState === "unsupported";
  const lastVaults = getLastVaultNames();
  const isDarkMode = document.documentElement.getAttribute("data-theme") === "dark";
  const lang = getLanguage();
  const onboarded = isOnboarded();
  const showDemoBadge = store.hasSampleData() && !isConnected;
  /** Full panel before onboard, permission/unsupported, or team roster still default-only. */
  const needsTeamSetup = isConnected && store.hasOnlyDefaultTeamRoster();
  const collapseVault = onboarded && !needsPermission && !isUnsupported && !needsTeamSetup;

  let vaultTitle = t().vault.offlineTitle;
  let vaultHint = t().vault.offlineHint;
  let indicatorClass = "offline";
  if (isUnsupported) {
    vaultTitle = t().vault.unsupportedTitle;
    vaultHint = t().vault.unsupportedHint;
    indicatorClass = "unsupported";
  } else if (isConnected) {
    vaultTitle = store.vault.vaultName;
    vaultHint = t().vault.connectedHint.replace("{name}", store.vault.vaultName);
    indicatorClass = "connected";
  } else if (needsPermission) {
    vaultTitle = t().vault.permissionTitle;
    vaultHint = t().vault.permissionHint;
    indicatorClass = "permission_needed";
  }

  const everythingLabel = t().views.everything || "Alle Aufgaben";
  const clients = store.getClients();
  const favoriteProjects = store.favoriteProjectIds
    .map(id => store.getProject(id))
    .filter((p): p is NonNullable<typeof p> => !!p);

  // Mobile backdrop (once)
  let backdrop = document.getElementById("sidebar-backdrop") as HTMLButtonElement | null;
  if (!backdrop) {
    backdrop = document.createElement("button");
    backdrop.type = "button";
    backdrop.id = "sidebar-backdrop";
    backdrop.className = "sidebar-backdrop";
    backdrop.setAttribute("aria-label", t().actions.toggleNav);
    document.querySelector(".app-root")?.appendChild(backdrop);
    backdrop.addEventListener("click", () => {
      closeMobileSidebar();
    });
  }

  sidebar.innerHTML = `
    <div class="sidebar-header">
      <div class="sidebar-workspace-title">
        <img
          class="sidebar-brand-logo"
          src="${isDarkMode ? "/brand/lockup-horizontal-dark.svg" : "/brand/lockup-horizontal-light.svg"}"
          alt="${t().appName}"
          width="104"
          height="22"
          decoding="async"
        />
        ${showDemoBadge ? `<span class="demo-chip sidebar-demo-chip">${t().empty.demoBadge}</span>` : ""}
      </div>
      <button type="button" id="sidebar-collapse-btn" class="sidebar-collapse-btn" data-sidebar-toggle aria-label="${t().actions.collapseSidebar}" title="${t().actions.collapseSidebar} (⌘\\)">
        ${TablerIcon.layoutSidebarLeftCollapse({ size: 16 })}
      </button>
    </div>

    ${collapseVault ? `
      <button type="button" id="sidebar-vault-btn" class="sidebar-vault-compact" title="${escapeHtml(vaultHint)}" aria-label="${isConnected ? escapeHtml(vaultTitle) : t().actions.connectVault}">
        <span class="vault-indicator ${indicatorClass}" aria-hidden="true"></span>
        <span class="sidebar-vault-compact-text">
          <span class="sidebar-vault-compact-label">${isConnected ? escapeHtml(vaultTitle) : escapeHtml(t().vault.offlineHintShort)}</span>
          ${!isConnected && !isUnsupported ? `<span class="sidebar-vault-compact-cta">${t().vault.connectFolder}</span>` : ""}
        </span>
      </button>
      ${isConnected ? renderSessionIdentityHTML() : ""}
    ` : `
    <div class="sidebar-vault-panel" data-state="${connectionState}">
      <div class="sidebar-vault-panel-title">
        <span class="vault-indicator ${indicatorClass}" aria-hidden="true"></span>
        <span>${escapeHtml(vaultTitle)}</span>
      </div>
      <p class="sidebar-vault-panel-hint">${escapeHtml(vaultHint)}</p>
      ${!isConnected && !isUnsupported && lastVaults.length > 0 ? `
        <div class="sidebar-vault-history" title="${t().actions.lastVaultsHint}">
          <span class="sidebar-vault-history-label">${t().actions.lastVaults}</span>
          ${lastVaults.map(n => `<span class="sidebar-vault-history-item">${escapeHtml(n)}</span>`).join("")}
        </div>
      ` : ""}
      <div class="sidebar-vault-actions">
        ${needsPermission ? `
          <button id="sidebar-vault-permission" class="sidebar-vault-action sidebar-vault-action-primary" type="button">
            ${t().actions.grantPermission}
          </button>
        ` : ""}
        ${isConnected ? `
          <p class="sidebar-vault-team-hint">${escapeHtml(t().vault.teamSharedHint)}</p>
          ${store.hasOnlyDefaultTeamRoster() ? `
            <button type="button" id="sidebar-team-setup" class="sidebar-vault-action sidebar-vault-action-primary">
              ${escapeHtml(t().vault.teamSetupHint)}
            </button>
          ` : ""}
          ${renderSessionIdentityHTML()}
          <button id="sidebar-vault-reload" class="sidebar-vault-action" type="button" title="${t().actions.reloadVault}">
            ${TablerIcon.refresh({ size: 12 })}
            <span>${t().actions.reloadVault}</span>
          </button>
          <button id="sidebar-vault-disconnect" class="sidebar-vault-action" type="button">
            ${t().actions.disconnectVault}
          </button>
          <button id="sidebar-vault-btn" class="sidebar-vault-action" type="button">
            ${t().actions.changeVault}
          </button>
        ` : isUnsupported ? `` : needsPermission ? `
          <button id="sidebar-vault-btn" class="sidebar-vault-action" type="button">
            ${t().actions.changeVault}
          </button>
        ` : `
          <button id="sidebar-vault-btn" class="sidebar-vault-action ${onboarded ? "sidebar-vault-action-primary" : ""}" type="button">
            ${t().actions.connectVault}
          </button>
        `}
      </div>
    </div>
    `}

    <div class="sidebar-nav-scroll">
      <!-- Views / Spaces -->
      <div>
        <div class="sidebar-section-title">
          <span>Views & Hubs</span>
        </div>
        <div class="sidebar-nav-list" role="list">
          <button class="sidebar-nav-item ${store.currentView === "dashboard" ? "active" : ""}" data-nav="dashboard">
            ${TablerIcon.layoutDashboard({ size: 16 })}
            <span>${t().views.dashboard}</span>
          </button>
          <button class="sidebar-nav-item ${store.currentView === "kanban" && !store.selectedClientId && !store.selectedProjectId ? "active" : ""}" data-nav="everything">
            ${TablerIcon.layoutKanban({ size: 16 })}
            <span>${escapeHtml(everythingLabel)}</span>
          </button>
          <button class="sidebar-nav-item ${store.currentView === "list" ? "active" : ""}" data-nav="list">
            ${TablerIcon.listDetails({ size: 16 })}
            <span>${t().views.list}</span>
          </button>
          <button class="sidebar-nav-item ${store.currentView === "gantt" ? "active" : ""}" data-nav="gantt">
            ${TablerIcon.timeline({ size: 16 })}
            <span>${t().views.gantt}</span>
          </button>
          <button class="sidebar-nav-item ${store.currentView === "calendar" ? "active" : ""}" data-nav="calendar">
            ${TablerIcon.calendar({ size: 16 })}
            <span>${t().views.calendar}</span>
          </button>
          <button class="sidebar-nav-item ${store.currentView === "docs" ? "active" : ""}" data-nav="docs">
            ${TablerIcon.fileText({ size: 16 })}
            <span>${t().views.docs}</span>
          </button>
          <button class="sidebar-nav-item ${store.currentView === "backoffice" ? "active" : ""}" data-nav="backoffice">
            ${TablerIcon.buildingStore({ size: 16 })}
            <span>${t().views.backoffice}</span>
          </button>
        </div>
      </div>

      ${favoriteProjects.length > 0 ? `
      <div>
        <div class="sidebar-section-title">
          <span>${t().sections.favorites}</span>
        </div>
        <div class="sidebar-nav-list" id="favorites-list">
          ${favoriteProjects.map(prj => `
            <button type="button" class="sidebar-nav-item ${store.selectedProjectId === prj.id ? "active" : ""}" data-favorite-id="${prj.id}">
              ${TablerIcon.starFilled({ size: 14 })}
              <span>${escapeHtml(prj.name)}</span>
            </button>
          `).join("")}
        </div>
      </div>
      ` : ""}

      <!-- Clients & Projects Navigation Tree -->
      <div>
        <div class="sidebar-section-title">
          <span>${t().sections.clientsAndProjects}</span>
        </div>

        <div class="sidebar-nav-list" id="client-tree-container">
          ${clients.map(client => {
            const isClientActive = store.selectedClientId === client.id && !store.selectedProjectId;
            const projects = store.getProjects(client.id);

            return `
              <div class="client-tree-item" data-client-id="${client.id}">
                <div class="client-header ${isClientActive ? "active" : ""}" role="button" tabindex="0">
                  <div style="display: flex; align-items: center; gap: 8px;">
                    <span class="client-dot" style="background-color: ${client.color};"></span>
                    <span style="font-size: var(--font-size-xs); font-weight: var(--font-weight-medium);">${escapeHtml(client.name)}</span>
                  </div>
                  <span style="font-size: 0.625rem; color: var(--color-text-muted);">${t().sections.projectCountShort.replace("{n}", String(projects.length))}</span>
                </div>
                <div class="project-tree-list">
                  ${projects.map(prj => {
                    const isPrjActive = store.selectedProjectId === prj.id;
                    const isFav = store.isFavoriteProject(prj.id);
                    return `
                      <div class="project-tree-item ${isPrjActive ? "active" : ""}" role="button" tabindex="0" data-project-id="${prj.id}">
                        <span style="color: var(--color-text-muted); opacity: 0.7;">#</span>
                        <span class="project-tree-name">${escapeHtml(prj.name)}</span>
                        <button type="button" class="project-fav-btn ${isFav ? "is-favorite" : ""}" data-fav-project="${prj.id}" title="${isFav ? t().actions.unpinFavorite : t().actions.pinFavorite}" aria-label="${isFav ? t().actions.unpinFavorite : t().actions.pinFavorite}">
                          ${isFav ? TablerIcon.starFilled({ size: 12 }) : TablerIcon.star({ size: 12 })}
                        </button>
                      </div>
                    `;
                  }).join("")}
                </div>
              </div>
            `;
          }).join("")}
        </div>
      </div>
    </div>

    <div class="sidebar-footer" aria-label="${t().actions.preferences}">
      <button type="button" id="sidebar-theme-btn" class="sidebar-footer-btn" title="${t().actions.themeToggle}" aria-label="${t().actions.themeToggle}">
        ${isDarkMode ? TablerIcon.sun({ size: 15 }) : TablerIcon.moon({ size: 15 })}
        <span>${t().actions.themeToggle}</span>
      </button>
      <button type="button" id="sidebar-lang-btn" class="sidebar-footer-btn" title="${t().actions.switchLanguage}" aria-label="${t().actions.switchLanguage}">
        <span class="sidebar-footer-lang">${lang.toUpperCase()}</span>
        <span>${t().actions.switchLanguage}</span>
      </button>
    </div>
  `;

  const closeMobileNav = (): void => {
    closeMobileSidebar();
  };

  sidebar.querySelector("#sidebar-collapse-btn")?.addEventListener("click", () => {
    toggleSidebar();
    store.notify();
  });

  // Attach Vault listener
  sidebar.querySelector("#sidebar-vault-btn")?.addEventListener("click", async () => {
    try {
      const connected = await store.vault.connect();
      if (connected) {
        announcer.announce(t().announcements.folderConnected);
        showToast(t().vault.connectedToast, "success");
        try { localStorage.setItem("proman_onboarded", "1"); } catch { /* ignore */ }
        const result = await store.reloadAll();
        if (!result.ok && result.reason === "permission_denied") {
          showToast(t().vault.permissionDeniedToast, "warning");
        } else if (result.ok && result.warning) {
          showToast(result.warning, "warning");
        }
      } else if (store.vault.consumeUserAbort()) {
        showToast(t().vault.connectAbortedToast, "info");
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Fehler beim Verbinden.";
      showToast(message, "error");
    }
  });

  sidebar.querySelector("#sidebar-vault-disconnect")?.addEventListener("click", async () => {
    await store.vault.disconnect();
    store.onVaultDisconnected();
    showToast(t().vault.disconnectedToast, "info");
    store.notify();
  });

  const identityMount = sidebar.querySelector<HTMLElement>("#sidebar-active-member-mount");
  if (identityMount) {
    const members = store.getMembers();
    const activeId = store.getActiveMemberId() || "";
    const identitySelect = new CustomSelect({
      id: "sidebar-active-member",
      prefixLabel: t().vault.iAm,
      ariaLabel: t().vault.iAmHint,
      selectedValue: activeId,
      options: [
        { value: "", label: t().vault.iAmUnset },
        ...members.map(m => ({ value: m.id, label: m.name, color: m.color })),
      ],
      onChange: (value) => {
        store.setActiveMemberId(value || null);
      },
    });
    identityMount.appendChild(identitySelect.getElement());
  }

  sidebar.querySelector("#sidebar-team-setup")?.addEventListener("click", () => {
    store.currentView = "backoffice";
    try {
      sessionStorage.setItem("proman_backoffice_tab", "team");
    } catch { /* ignore */ }
    closeMobileNav();
    store.notify();
  });

  sidebar.querySelector("#sidebar-vault-reload")?.addEventListener("click", async () => {
    const result = await store.reloadAll();
    if (result.ok) {
      showToast(result.warning || t().vault.reloadedToast, result.warning ? "warning" : "success");
    } else if (result.reason === "permission_denied") {
      showToast(t().vault.permissionDeniedToast, "warning");
    } else {
      showToast(result.message || t().vault.reloadFailedToast, "error");
    }
  });

  sidebar.querySelector("#sidebar-vault-permission")?.addEventListener("click", async () => {
    const granted = await store.vault.requestPendingPermission();
    if (granted) {
      announcer.announce(t().announcements.folderConnected);
      showToast(t().vault.connectedToast, "success");
      const result = await store.reloadAll();
      if (!result.ok && result.reason === "permission_denied") {
        showToast(t().vault.permissionDeniedToast, "warning");
      } else if (result.ok && result.warning) {
        showToast(result.warning, "warning");
      }
    } else {
      showToast(t().vault.permissionDeniedToast, "warning");
      store.notify();
    }
  });

  // Attach View navigation
  sidebar.querySelectorAll<HTMLButtonElement>(".sidebar-nav-item").forEach(btn => {
    btn.addEventListener("click", () => {
      const nav = btn.dataset.nav;
      const favId = btn.dataset.favoriteId;
      if (favId) {
        selectProject(favId);
        closeMobileNav();
        return;
      }
      if (nav === "dashboard") {
        store.selectedClientId = null;
        store.selectedProjectId = null;
        store.currentView = "dashboard";
      } else if (nav === "everything") {
        store.selectedClientId = null;
        store.selectedProjectId = null;
        store.currentView = "kanban";
      } else if (nav === "list") {
        store.currentView = "list";
      } else if (nav === "gantt") {
        store.currentView = "gantt";
      } else if (nav === "calendar") {
        store.currentView = "calendar";
      } else if (nav === "docs") {
        store.currentView = "docs";
      } else if (nav === "backoffice") {
        store.currentView = "backoffice";
      }
      closeMobileNav();
      store.notify();
    });
  });

  const selectProject = (prjId: string) => {
    const prj = store.getProject(prjId);
    if (prj) {
      store.selectedClientId = prj.clientId;
      store.selectedProjectId = prj.id;
      if (store.currentView === "backoffice" || store.currentView === "client") {
        store.currentView = "kanban";
      }
      closeMobileNav();
      store.notify();
    }
  };

  const selectClient = (clientId: string) => {
    store.selectedClientId = clientId;
    store.selectedProjectId = null;
    store.currentView = "client";
    closeMobileNav();
    store.notify();
  };

  // Client & Project tree click / keyboard delegation
  const treeContainer = sidebar.querySelector("#client-tree-container");
  treeContainer?.addEventListener("click", (e) => {
    const target = e.target as HTMLElement;

    const favBtn = target.closest<HTMLButtonElement>(".project-fav-btn");
    if (favBtn?.dataset.favProject) {
      e.stopPropagation();
      store.toggleFavoriteProject(favBtn.dataset.favProject);
      return;
    }

    const prjItem = target.closest<HTMLElement>(".project-tree-item");
    if (prjItem) {
      const prjId = prjItem.dataset.projectId;
      if (prjId) selectProject(prjId);
      return;
    }

    const clientHeader = target.closest<HTMLElement>(".client-header");
    if (clientHeader) {
      const clientTree = clientHeader.closest<HTMLElement>(".client-tree-item");
      const clientId = clientTree?.dataset.clientId;
      if (clientId) selectClient(clientId);
    }
  });

  treeContainer?.addEventListener("keydown", (e) => {
    const ke = e as KeyboardEvent;
    if (ke.key !== "Enter" && ke.key !== " ") return;
    const target = ke.target as HTMLElement;

    const prjItem = target.closest<HTMLElement>(".project-tree-item");
    if (prjItem && target === prjItem) {
      ke.preventDefault();
      const prjId = prjItem.dataset.projectId;
      if (prjId) selectProject(prjId);
      return;
    }

    const clientHeader = target.closest<HTMLElement>(".client-header");
    if (clientHeader && target === clientHeader) {
      ke.preventDefault();
      const clientTree = clientHeader.closest<HTMLElement>(".client-tree-item");
      const clientId = clientTree?.dataset.clientId;
      if (clientId) selectClient(clientId);
    }
  });

  sidebar.querySelector("#sidebar-theme-btn")?.addEventListener("click", () => {
    const root = document.documentElement;
    const isSystemDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    const currentTheme = root.getAttribute("data-theme") || (isSystemDark ? "dark" : "light");
    const nextTheme = currentTheme === "dark" ? "light" : "dark";
    root.setAttribute("data-theme", nextTheme);
    try {
      localStorage.setItem("proman_theme_mode", nextTheme);
    } catch { /* ignore */ }
    store.notify();
  });

  sidebar.querySelector("#sidebar-lang-btn")?.addEventListener("click", () => {
    const next = getLanguage() === "de" ? "en" : "de";
    setLanguage(next);
    document.documentElement.lang = next;
    store.notify();
  });

  container.innerHTML = "";
  container.appendChild(sidebar);
}

function renderSessionIdentityHTML(): string {
  return `
    <div class="sidebar-session-identity">
      <span class="sidebar-session-identity-label">${escapeHtml(t().vault.iAm)}</span>
      <div id="sidebar-active-member-mount" class="sidebar-session-identity-mount"></div>
    </div>
  `;
}

function escapeHtml(text: string): string {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

