import { store, ViewMode, QuickFilter } from "../storage/store";
import { t, setLanguage, getLanguage } from "../i18n";
import { CustomSelect } from "./custom-select";
import { TablerIcon } from "./icons";
import { isSidebarVisible, toggleSidebar } from "../storage/sidebar-layout";

const FILTERS_EXPANDED_KEY = "proman_filters_expanded";

function isFiltersExpanded(): boolean {
  try {
    return sessionStorage.getItem(FILTERS_EXPANDED_KEY) === "1";
  } catch {
    return false;
  }
}

function setFiltersExpanded(open: boolean): void {
  try {
    sessionStorage.setItem(FILTERS_EXPANDED_KEY, open ? "1" : "0");
  } catch { /* ignore */ }
}

function positionFilterPopoverEl(btn: HTMLElement, popover: HTMLElement): void {
  // Must run after the trigger is in the document — otherwise getBoundingClientRect is 0,0
  if (!document.contains(btn)) return;
  const rect = btn.getBoundingClientRect();
  if (rect.width === 0 && rect.height === 0) return;

  const pad = 12;
  const width = Math.min(320, window.innerWidth - pad * 2);
  let left = rect.left;
  if (left + width > window.innerWidth - pad) {
    left = Math.max(pad, window.innerWidth - pad - width);
  }
  popover.style.position = "fixed";
  popover.style.top = `${Math.round(rect.bottom + 6)}px`;
  popover.style.left = `${Math.round(left)}px`;
  popover.style.width = `${width}px`;
}

let filterPopoverOutsideClick: ((e: MouseEvent) => void) | null = null;
let filterPopoverReposition: (() => void) | null = null;

function clearFilterPopoverListeners(): void {
  if (filterPopoverOutsideClick) {
    document.removeEventListener("click", filterPopoverOutsideClick);
    filterPopoverOutsideClick = null;
  }
  if (filterPopoverReposition) {
    window.removeEventListener("resize", filterPopoverReposition);
    window.removeEventListener("scroll", filterPopoverReposition, true);
    filterPopoverReposition = null;
  }
}

function bindFilterPopoverDismiss(btn: HTMLElement, popover: HTMLElement, close: () => void): void {
  clearFilterPopoverListeners();
  filterPopoverOutsideClick = (e: MouseEvent) => {
    const target = e.target as Node;
    if (btn.contains(target) || popover.contains(target)) return;
    // Ignore clicks inside portaled CustomSelect menus
    if ((target as Element).closest?.(".custom-select-menu")) return;
    close();
  };
  filterPopoverReposition = () => positionFilterPopoverEl(btn, popover);
  setTimeout(() => {
    if (filterPopoverOutsideClick) document.addEventListener("click", filterPopoverOutsideClick);
  }, 0);
  window.addEventListener("resize", filterPopoverReposition);
  window.addEventListener("scroll", filterPopoverReposition, true);
}

function countSecondaryFilters(): number {
  let n = 0;
  if (store.filterStatus !== "all") n++;
  if (store.filterAssignee !== "all") n++;
  if (store.filterCycle.trim()) n++;
  return n;
}

function countPrimaryFilters(): number {
  let n = 0;
  if (store.selectedClientId) n++;
  if (store.selectedProjectId) n++;
  if (store.filterPriority !== "all") n++;
  if (store.filterQuick !== "all") n++;
  if (store.searchQuery.trim()) n++;
  return n + countSecondaryFilters();
}

const PRIMARY_VIEWS: Array<{ id: ViewMode; labelKey: "kanban" | "list" | "gantt" | "calendar"; icon: (p?: { size?: number }) => string }> = [
  { id: "kanban", labelKey: "kanban", icon: TablerIcon.layoutKanban },
  { id: "list", labelKey: "list", icon: TablerIcon.listDetails },
  { id: "gantt", labelKey: "gantt", icon: TablerIcon.timeline },
  { id: "calendar", labelKey: "calendar", icon: TablerIcon.calendar },
];

export function renderTopbar(
  container: HTMLElement,
  onNewTask: () => void,
  onNewDoc: () => void,
  onOpenCommandPalette: () => void,
  onNewClient: () => void = () => {},
  onOpenBoard: () => void = () => {},
): void {
  clearFilterPopoverListeners();
  // Close any portaled select menus before tearing down the previous topbar
  CustomSelect.closeAll();
  document.querySelectorAll(".custom-select-menu.is-open").forEach(menu => {
    menu.classList.remove("is-open");
    if (menu.parentElement === document.body) menu.remove();
  });

  const topbar = document.createElement("header");
  topbar.className = "app-topbar";
  topbar.setAttribute("role", "banner");

  const clients = store.getClients();
  const selectedClient = store.selectedClientId ? store.getClient(store.selectedClientId) : null;
  const availableProjects = store.getProjects(store.selectedClientId || undefined);
  const selectedProject = store.selectedProjectId ? store.getProject(store.selectedProjectId) : null;

  const breadcrumbClient = selectedClient ? selectedClient.name : t().sections.allClients;
  const breadcrumbProject = selectedProject ? selectedProject.name : null;

  const hasActiveFilters = countPrimaryFilters() > 0;
  const secondaryCount = countSecondaryFilters();
  const filtersOpen = isFiltersExpanded();
  const isDarkMode = document.documentElement.getAttribute("data-theme") === "dark";
  const taskCount = store.getAllRawTasks().length;
  const hideFilters =
    taskCount === 0 ||
    store.currentView === "docs" ||
    store.currentView === "backoffice" ||
    store.currentView === "client";
  const isCalendar = store.currentView === "calendar";
  const hasScope = !!(store.selectedClientId || store.selectedProjectId);
  const sidebarVisible = isSidebarVisible();
  const showPrimaryViews = !["docs", "backoffice", "client"].includes(store.currentView);
  const secondaryViewLabel =
    store.currentView === "docs" ? t().views.docs
      : store.currentView === "client" ? t().views.client
        : t().views.backoffice;

  type PrimaryCta = { id: string; label: string; icon: string };
  let primaryCta: PrimaryCta = {
    id: "topbar-new-task-btn",
    label: t().actions.newTask,
    icon: TablerIcon.plus({ size: 14, strokeWidth: 2.5 }),
  };
  if (store.currentView === "docs") {
    primaryCta = {
      id: "topbar-primary-new-doc",
      label: t().actions.newDoc,
      icon: TablerIcon.plus({ size: 14, strokeWidth: 2.5 }),
    };
  } else if (store.currentView === "backoffice") {
    primaryCta = {
      id: "topbar-primary-new-client",
      label: t().actions.newClient,
      icon: TablerIcon.plus({ size: 14, strokeWidth: 2.5 }),
    };
  } else if (store.currentView === "client") {
    primaryCta = {
      id: "topbar-primary-open-board",
      label: t().actions.openBoard,
      icon: TablerIcon.layoutKanban({ size: 14, strokeWidth: 2 }),
    };
  }
  const showNewTaskInOverflow = store.currentView === "docs" || store.currentView === "backoffice" || store.currentView === "client";
  const showNewDocInOverflow = store.currentView !== "docs";

  const quickChips = isCalendar
    ? (["overdue", "due_soon"] as QuickFilter[])
    : (["overdue", "due_soon", "has_blocker", "no_date"] as QuickFilter[]);

  const chipLabel = (q: QuickFilter): string => {
    if (q === "overdue") return t().filters.overdue;
    if (q === "due_soon") return t().filters.dueThisWeek;
    if (q === "has_blocker") return t().filters.hasBlocker;
    return t().filters.noDueDate;
  };

  const chipIcon = (q: QuickFilter): string => {
    if (q === "overdue") return TablerIcon.clockAlert({ size: 12 });
    if (q === "due_soon") return TablerIcon.calendarDue({ size: 12 });
    if (q === "has_blocker") return TablerIcon.lockBlocked({ size: 12 });
    return TablerIcon.calendarOff({ size: 12 });
  };

  topbar.innerHTML = `
    <div class="topbar-upper-row">
      <div class="topbar-left">
        <button id="topbar-sidebar-toggle" data-sidebar-toggle class="btn btn-ghost btn-icon topbar-sidebar-toggle" type="button" aria-label="${t().actions.toggleNav}" aria-expanded="${sidebarVisible}" aria-pressed="${sidebarVisible}" title="${t().actions.toggleNav} (⌘\\)">
          ${sidebarVisible ? TablerIcon.layoutSidebarLeftCollapse({ size: 16 }) : TablerIcon.layoutSidebarLeftExpand({ size: 16 })}
        </button>

        <nav class="breadcrumbs" aria-label="Breadcrumb">
          <button type="button" class="breadcrumb-link" id="bc-root">Workspace</button>
          <span class="breadcrumb-separator" aria-hidden="true">/</span>
          <button type="button" class="breadcrumb-link ${!breadcrumbProject ? "breadcrumb-active" : ""}" id="bc-client">${escapeHtml(breadcrumbClient)}</button>
          ${breadcrumbProject ? `
            <span class="breadcrumb-separator" aria-hidden="true">/</span>
            <span class="breadcrumb-active">${escapeHtml(breadcrumbProject)}</span>
          ` : ""}
        </nav>

        ${showPrimaryViews ? `
          <nav class="view-switcher view-switcher-compact" role="tablist" aria-label="${t().filters.views}">
            ${PRIMARY_VIEWS.map(v => `
              <button class="view-btn" data-view="${v.id}" role="tab" aria-selected="${store.currentView === v.id}" aria-pressed="${store.currentView === v.id}" title="${t().views[v.labelKey]}" aria-label="${t().views[v.labelKey]}">
                ${v.icon({ size: 15 })}
              </button>
            `).join("")}
          </nav>
        ` : `
          <span class="topbar-view-label">${secondaryViewLabel}</span>
        `}
      </div>

      <div class="topbar-actions">
        <button type="button" class="bespoke-search-box" id="command-search-trigger" aria-label="${t().actions.searchPlaceholder}" title="${t().actions.searchPlaceholder}">
          ${TablerIcon.search({ size: 15, strokeWidth: 2 })}
          <span class="search-placeholder-text">${store.searchQuery.trim() ? escapeHtml(store.searchQuery) : t().actions.searchShort}</span>
          <span class="search-badge">⌘K</span>
        </button>

        <div class="topbar-overflow">
          <button type="button" id="topbar-overflow-btn" class="btn btn-ghost btn-icon" aria-haspopup="menu" aria-expanded="false" aria-controls="topbar-overflow-menu" title="${t().actions.moreActions}" aria-label="${t().actions.moreActions}">
            ${TablerIcon.dotsVertical({ size: 16 })}
          </button>
          <div id="topbar-overflow-menu" class="topbar-overflow-menu" role="menu" hidden>
            ${showNewTaskInOverflow ? `
            <button type="button" class="topbar-overflow-item" role="menuitem" id="topbar-overflow-new-task">
              ${TablerIcon.plus({ size: 14 })}
              <span>${t().actions.newTask}</span>
              <kbd>N</kbd>
            </button>
            ` : ""}
            ${showNewDocInOverflow ? `
            <button type="button" class="topbar-overflow-item" role="menuitem" id="topbar-new-doc-btn">
              ${TablerIcon.fileText({ size: 14 })}
              <span>${t().actions.newDoc}</span>
              <kbd>D</kbd>
            </button>
            ` : ""}
            <button type="button" class="topbar-overflow-item" role="menuitem" id="topbar-undo">
              ${TablerIcon.arrowBackUp({ size: 14 })}
              <span>${t().actions.undo}</span>
              <kbd>⌘Z</kbd>
            </button>
            <button type="button" class="topbar-overflow-item" role="menuitem" id="topbar-redo">
              ${TablerIcon.arrowForwardUp({ size: 14 })}
              <span>${t().actions.redo}</span>
              <kbd>⌘⇧Z</kbd>
            </button>
            <div class="topbar-overflow-sep" role="separator"></div>
            <button type="button" class="topbar-overflow-item" role="menuitem" id="topbar-lang-btn">
              <span class="topbar-overflow-lang">${getLanguage().toUpperCase()}</span>
              <span>${t().actions.switchLanguage}</span>
            </button>
            <button type="button" class="topbar-overflow-item" role="menuitem" id="topbar-theme-btn">
              ${isDarkMode ? TablerIcon.sun({ size: 14 }) : TablerIcon.moon({ size: 14 })}
              <span>${t().actions.themeToggle}</span>
            </button>
          </div>
        </div>

        <button id="${primaryCta.id}" class="btn btn-primary topbar-primary-cta" title="${escapeHtml(primaryCta.label)}" aria-label="${escapeHtml(primaryCta.label)}">
          ${primaryCta.icon}
          <span>${escapeHtml(primaryCta.label)}</span>
        </button>
      </div>
    </div>

    ${hideFilters ? "" : `
    <div class="topbar-filter-row" role="search" aria-label="${t().filters.barLabel}">
      <div class="filter-primary-row" id="filter-primary-row">
        ${hasScope ? `
          <div class="filter-scope-pills" aria-label="${t().filters.scope}">
            ${selectedClient ? `
              <button type="button" class="scope-pill" data-clear-scope="client" title="${t().filters.clearClient}">
                <span class="scope-pill-dot" style="background:${selectedClient.color}" aria-hidden="true"></span>
                <span>${escapeHtml(selectedClient.name)}</span>
                <span class="scope-pill-x" aria-hidden="true">×</span>
              </button>
            ` : ""}
            ${selectedProject ? `
              <button type="button" class="scope-pill" data-clear-scope="project" title="${t().filters.clearProject}">
                <span>#</span>
                <span>${escapeHtml(selectedProject.name)}</span>
                <span class="scope-pill-x" aria-hidden="true">×</span>
              </button>
            ` : ""}
          </div>
        ` : `<div class="filter-scope-selects" id="filter-scope-selects"></div>`}

        <div class="filter-core-selects" id="filter-core-selects"></div>
        <div class="filter-quick-select" id="filter-quick-select"></div>

        ${!isCalendar ? `
        <div class="filter-popover-wrap">
          <button type="button" id="toggle-more-filters" class="btn btn-ghost filter-more-btn ${filtersOpen ? "is-open" : ""} ${secondaryCount > 0 ? "has-active" : ""}" aria-expanded="${filtersOpen}" aria-controls="filter-popover" title="${t().filters.openPanel}">
            ${TablerIcon.filter({ size: 13 })}
            <span>${t().filters.more}</span>
            ${secondaryCount > 0 ? `<span class="filter-more-badge">${secondaryCount}</span>` : ""}
          </button>
        </div>
        ` : ""}

        ${hasActiveFilters ? `
          <button type="button" id="clear-filters-btn" class="btn btn-ghost-danger filter-clear-btn" aria-label="${t().filters.clearFilters}">
            ${TablerIcon.x({ size: 12 })}
            <span>${t().filters.clear}</span>
          </button>
        ` : ""}
      </div>

      ${!isCalendar ? `
      <div class="filter-popover ${filtersOpen ? "is-open" : ""}" id="filter-popover" role="dialog" aria-label="${t().filters.more}" ${filtersOpen ? "" : "hidden"}>
        <div class="filter-popover-row" id="filter-secondary-selects"></div>
        <label class="cycle-filter-chip" title="${t().filters.cycle}">
          <span class="sr-only">${t().filters.cycle}</span>
          <input type="text" id="filter-cycle-input" class="cycle-filter-input" value="${escapeHtml(store.filterCycle)}" placeholder="${t().filters.cyclePlaceholder}" />
        </label>
      </div>
      ` : ""}
    </div>
    `}
  `;

  if (!hideFilters) {
    const scopeMount = topbar.querySelector("#filter-scope-selects");
    const coreMount = topbar.querySelector("#filter-core-selects")!;
    const quickMount = topbar.querySelector("#filter-quick-select")!;
    const secondaryMount = topbar.querySelector("#filter-secondary-selects");

    if (scopeMount && !hasScope) {
      const clientSelect = new CustomSelect({
        prefixLabel: t().filters.client,
        options: [
          { value: "", label: t().filters.all },
          ...clients.map(c => ({ value: c.id, label: c.name, color: c.color })),
        ],
        selectedValue: store.selectedClientId || "",
        ariaLabel: t().filters.client,
        onChange: (val) => {
          store.selectedClientId = val || null;
          store.selectedProjectId = null;
          store.notify();
        },
      });
      const projectSelect = new CustomSelect({
        prefixLabel: t().filters.project,
        options: [
          { value: "", label: t().filters.all },
          ...availableProjects.map(p => ({ value: p.id, label: p.name, color: p.color })),
        ],
        selectedValue: store.selectedProjectId || "",
        ariaLabel: t().filters.project,
        onChange: (val) => {
          store.selectedProjectId = val || null;
          store.notify();
        },
      });
      scopeMount.appendChild(clientSelect.getElement());
      scopeMount.appendChild(projectSelect.getElement());
    }

    if (!isCalendar) {
      const prioritySelect = new CustomSelect({
        prefixLabel: t().filters.priority,
        options: [
          { value: "all", label: t().filters.all },
          { value: "urgent", label: t().priorities.urgent, color: "#dc2626", iconSvg: TablerIcon.alertTriangle({ size: 13, strokeWidth: 2.2 }) },
          { value: "high", label: t().priorities.high, color: "#c25e1a", iconSvg: TablerIcon.arrowUp({ size: 13, strokeWidth: 2.2 }) },
          { value: "normal", label: t().priorities.normal, color: "#6e6757", iconSvg: TablerIcon.minus({ size: 13, strokeWidth: 2.2 }) },
          { value: "low", label: t().priorities.low, color: "#948d7d", iconSvg: TablerIcon.arrowDown({ size: 13, strokeWidth: 2.2 }) },
        ],
        selectedValue: store.filterPriority,
        ariaLabel: t().filters.priority,
        onChange: (val) => {
          store.filterPriority = val as any;
          store.notify();
        },
      });
      coreMount.appendChild(prioritySelect.getElement());
    }

    const quickSelect = new CustomSelect({
      prefixLabel: t().filters.quick,
      options: [
        { value: "all", label: t().filters.all },
        ...quickChips.map(q => ({
          value: q,
          label: chipLabel(q),
          iconSvg: chipIcon(q),
        })),
      ],
      selectedValue: store.filterQuick,
      ariaLabel: t().filters.quick,
      onChange: (val) => {
        store.filterQuick = (val || "all") as QuickFilter;
        store.notify();
      },
    });
    quickMount.appendChild(quickSelect.getElement());
    if (store.filterQuick !== "all") {
      quickSelect.getElement().classList.add("filter-select-active");
    }

    if (secondaryMount && !isCalendar) {
      const statusSelect = new CustomSelect({
        prefixLabel: t().filters.status,
        options: [
          { value: "all", label: t().filters.all },
          { value: "todo", label: t().statuses.todo, color: "#948d7d", iconSvg: TablerIcon.circle({ size: 12, strokeWidth: 2 }) },
          { value: "in-progress", label: t().statuses["in-progress"], color: "#2563eb", iconSvg: TablerIcon.loader({ size: 12, strokeWidth: 2 }) },
          { value: "in-review", label: t().statuses["in-review"], color: "#d97706", iconSvg: TablerIcon.eye({ size: 12, strokeWidth: 2 }) },
          { value: "done", label: t().statuses.done, color: "#2e7d32", iconSvg: TablerIcon.circleCheck({ size: 12, strokeWidth: 2 }) },
        ],
        selectedValue: store.filterStatus,
        ariaLabel: t().filters.status,
        onChange: (val) => {
          store.filterStatus = val as any;
          store.notify();
        },
      });
      const members = store.getMembers();
      const assigneeSelect = new CustomSelect({
        prefixLabel: t().filters.assignee,
        options: [
          { value: "all", label: t().filters.all },
          ...members.map(m => ({ value: m.id, label: m.name })),
        ],
        selectedValue: store.filterAssignee,
        ariaLabel: t().filters.assignee,
        onChange: (val) => {
          store.filterAssignee = val as any;
          store.notify();
        },
      });
      secondaryMount.appendChild(statusSelect.getElement());
      secondaryMount.appendChild(assigneeSelect.getElement());
    }

    topbar.querySelectorAll<HTMLButtonElement>("[data-clear-scope]").forEach(btn => {
      btn.addEventListener("click", () => {
        const kind = btn.dataset.clearScope;
        if (kind === "client") {
          store.selectedClientId = null;
          store.selectedProjectId = null;
        } else if (kind === "project") {
          store.selectedProjectId = null;
        }
        store.notify();
      });
    });

    const filterBtn = topbar.querySelector<HTMLButtonElement>("#toggle-more-filters");
    const filterPopover = topbar.querySelector<HTMLElement>("#filter-popover");

    const syncFilterPopover = (open: boolean) => {
      setFiltersExpanded(open);
      if (!filterPopover || !filterBtn) return;
      filterPopover.hidden = !open;
      filterPopover.classList.toggle("is-open", open);
      filterBtn.classList.toggle("is-open", open);
      filterBtn.setAttribute("aria-expanded", String(open));
      if (open) {
        positionFilterPopoverEl(filterBtn, filterPopover);
        bindFilterPopoverDismiss(filterBtn, filterPopover, () => syncFilterPopover(false));
      } else {
        clearFilterPopoverListeners();
      }
    };

    filterBtn?.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const next = !filterPopover?.classList.contains("is-open");
      syncFilterPopover(next);
    });

    // Positioning runs after mount (see end of renderTopbar) — only wire dismiss here if already open
    if (filtersOpen && filterBtn && filterPopover) {
      bindFilterPopoverDismiss(filterBtn, filterPopover, () => syncFilterPopover(false));
    }

    const cycleInput = topbar.querySelector<HTMLInputElement>("#filter-cycle-input");
    let cycleTimer: ReturnType<typeof setTimeout> | null = null;
    cycleInput?.addEventListener("input", () => {
      if (cycleTimer) clearTimeout(cycleTimer);
      cycleTimer = setTimeout(() => {
        store.filterCycle = cycleInput.value;
        store.notify();
      }, 250);
    });
    cycleInput?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        if (cycleTimer) clearTimeout(cycleTimer);
        store.filterCycle = cycleInput.value;
        store.notify();
      }
    });

    topbar.querySelector("#clear-filters-btn")?.addEventListener("click", () => {
      store.clearFilters();
    });
  }

  topbar.querySelector("#topbar-sidebar-toggle")?.addEventListener("click", () => {
    toggleSidebar();
    renderTopbar(container, onNewTask, onNewDoc, onOpenCommandPalette, onNewClient, onOpenBoard);
  });

  topbar.querySelectorAll<HTMLButtonElement>(".view-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      store.currentView = btn.dataset.view as ViewMode;
      store.notify();
    });
  });

  topbar.querySelector("#bc-root")?.addEventListener("click", () => {
    store.selectedClientId = null;
    store.selectedProjectId = null;
    store.currentView = "kanban";
    store.notify();
  });

  topbar.querySelector("#bc-client")?.addEventListener("click", () => {
    store.selectedProjectId = null;
    if (store.selectedClientId) {
      store.currentView = "client";
    }
    store.notify();
  });

  const searchTrigger = topbar.querySelector("#command-search-trigger")!;
  searchTrigger.addEventListener("click", onOpenCommandPalette);
  searchTrigger.addEventListener("keydown", (e: Event) => {
    const ke = e as KeyboardEvent;
    if (ke.key === "Enter" || ke.key === " ") {
      ke.preventDefault();
      onOpenCommandPalette();
    }
  });

  const overflowBtn = topbar.querySelector<HTMLButtonElement>("#topbar-overflow-btn");
  const overflowMenu = topbar.querySelector<HTMLElement>("#topbar-overflow-menu");
  const closeOverflow = () => {
    if (!overflowMenu || !overflowBtn) return;
    overflowMenu.hidden = true;
    overflowBtn.setAttribute("aria-expanded", "false");
  };
  const openOverflow = () => {
    if (!overflowMenu || !overflowBtn) return;
    overflowMenu.hidden = false;
    overflowBtn.setAttribute("aria-expanded", "true");
  };

  overflowBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    if (overflowMenu?.hidden) openOverflow();
    else closeOverflow();
  });

  overflowMenu?.querySelectorAll(".topbar-overflow-item").forEach(item => {
    item.addEventListener("click", () => closeOverflow());
  });

  const onDocClick = (e: MouseEvent) => {
    const target = e.target as Node;
    if (!topbar.querySelector(".topbar-overflow")?.contains(target)) {
      closeOverflow();
      document.removeEventListener("click", onDocClick);
    }
  };
  overflowBtn?.addEventListener("click", () => {
    setTimeout(() => document.addEventListener("click", onDocClick), 0);
  });

  topbar.querySelector("#topbar-undo")?.addEventListener("click", () => store.undo());
  topbar.querySelector("#topbar-redo")?.addEventListener("click", () => store.redo());

  topbar.querySelector("#topbar-lang-btn")?.addEventListener("click", () => {
    const next = getLanguage() === "de" ? "en" : "de";
    setLanguage(next);
    document.documentElement.lang = next;
    store.notify();
  });

  topbar.querySelector("#topbar-theme-btn")?.addEventListener("click", () => {
    const root = document.documentElement;
    const isSystemDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    const currentTheme = root.getAttribute("data-theme") || (isSystemDark ? "dark" : "light");
    const nextTheme = currentTheme === "dark" ? "light" : "dark";
    root.setAttribute("data-theme", nextTheme);
    try {
      localStorage.setItem("proman_theme_mode", nextTheme);
    } catch {}
    renderTopbar(container, onNewTask, onNewDoc, onOpenCommandPalette, onNewClient, onOpenBoard);
  });

  topbar.querySelector("#topbar-new-task-btn")?.addEventListener("click", onNewTask);
  topbar.querySelector("#topbar-overflow-new-task")?.addEventListener("click", onNewTask);
  topbar.querySelector("#topbar-new-doc-btn")?.addEventListener("click", onNewDoc);
  topbar.querySelector("#topbar-primary-new-doc")?.addEventListener("click", onNewDoc);
  topbar.querySelector("#topbar-primary-new-client")?.addEventListener("click", onNewClient);
  topbar.querySelector("#topbar-primary-open-board")?.addEventListener("click", onOpenBoard);

  container.innerHTML = "";
  container.appendChild(topbar);

  // Position only after the trigger is laid out in the document (notify remounts used to leave it at 0,0)
  if (filtersOpen && !hideFilters && !isCalendar) {
    const filterBtn = topbar.querySelector<HTMLButtonElement>("#toggle-more-filters");
    const filterPopover = topbar.querySelector<HTMLElement>("#filter-popover");
    if (filterBtn && filterPopover) {
      const place = () => positionFilterPopoverEl(filterBtn, filterPopover);
      place();
      requestAnimationFrame(place);
    }
  }
}

function escapeHtml(text: string): string {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}
