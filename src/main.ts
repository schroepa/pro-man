import { store } from "./storage/store";
import { renderSidebar } from "./components/sidebar";
import { renderTopbar } from "./components/topbar";
import { renderKanbanBoard } from "./views/kanban-board";
import { renderListView } from "./views/list-view";
import { TaskDialog } from "./components/task-dialog";
import { CommandPalette } from "./components/command-palette";
import { TaskStatus } from "./types/task";
import { themeManager } from "./storage/theme-manager";
import { initSquircleEngine } from "./utils/squircle";
import { t } from "./i18n";
import { initSidebarLayout, toggleSidebar } from "./storage/sidebar-layout";
import { renderOnboardingBanner } from "./components/onboarding-banner";
import { renderMobileBottomNav } from "./components/mobile-bottom-nav";
import { initMobileGestures } from "./utils/mobile-gestures";
import { getChromeSignature } from "./utils/chrome-signature";
import { markAppBooted, recoverBrokenShell, registerServiceWorker } from "./utils/service-worker";

const sidebarContainer = document.getElementById("sidebar-container")!;
const topbarContainer = document.getElementById("topbar-container")!;
const viewContainer = document.getElementById("view-container")!;
const mainContent = document.getElementById("main-content")!;
const mobileNavContainer = document.getElementById("mobile-nav-container")!;

const taskDialog = new TaskDialog();

function openTask(taskId: string): void {
  const task = store.getTaskById(taskId);
  if (task) {
    taskDialog.open(task);
  }
}

function createNewTask(status?: TaskStatus): void {
  taskDialog.open(status || "todo");
}

function createNewDoc(): void {
  store.currentView = "docs";
  const newId = `DOC-${String(Math.floor(100 + Math.random() * 900))}`;
  const clients = store.getClients();
  const defaultClient = store.selectedClientId || (clients.length > 0 ? clients[0].id : "cli-internal");
  const projects = store.getProjects(defaultClient);
  const defaultProject = store.selectedProjectId || (projects.length > 0 ? projects[0].id : "prj-core-dev");

  store.saveDoc({
    id: newId,
    clientId: defaultClient,
    projectId: defaultProject,
    title: t().docs.untitled,
    content: "",
    tags: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  store.selectedDocId = newId;
  store.notify();
}

function createNewClient(): void {
  store.currentView = "backoffice";
  try {
    sessionStorage.setItem("proman_backoffice_new_client", "1");
  } catch { /* ignore */ }
  store.notify();
}

function openClientBoard(): void {
  store.currentView = "kanban";
  store.notify();
}

const commandPalette = new CommandPalette(
  () => createNewTask(),
  () => createNewDoc(),
  (taskId) => openTask(taskId)
);

let lastView: string | null = null;
let lastChromeSig = "";
let viewRenderGen = 0;

function renderChrome(): void {
  renderSidebar(sidebarContainer);
  renderTopbar(
    topbarContainer,
    () => createNewTask(),
    () => createNewDoc(),
    () => commandPalette.open(),
    () => createNewClient(),
    () => openClientBoard(),
  );
  renderMobileBottomNav(mobileNavContainer);
}

async function mountActiveView(viewMount: HTMLElement): Promise<void> {
  const gen = ++viewRenderGen;
  const view = store.currentView;

  if (view === "kanban") {
    renderKanbanBoard(viewMount, openTask, createNewTask);
    return;
  }
  if (view === "list") {
    renderListView(viewMount, openTask, () => createNewTask());
    return;
  }

  viewMount.innerHTML = `<div class="app-loading view-lazy-loading" style="padding: var(--space-6); color: var(--color-text-muted); font-size: var(--font-size-sm);">${t().loading}</div>`;

  try {
    if (view === "gantt") {
      const { renderGanttChart } = await import("./views/gantt-chart");
      if (gen !== viewRenderGen || store.currentView !== view) return;
      viewMount.innerHTML = "";
      renderGanttChart(viewMount, openTask, createNewTask);
    } else if (view === "calendar") {
      const { renderCalendarView } = await import("./views/calendar-view");
      if (gen !== viewRenderGen || store.currentView !== view) return;
      viewMount.innerHTML = "";
      renderCalendarView(viewMount, openTask);
    } else if (view === "docs") {
      const { renderDocsView } = await import("./views/docs-view");
      if (gen !== viewRenderGen || store.currentView !== view) return;
      viewMount.innerHTML = "";
      renderDocsView(viewMount);
    } else if (view === "backoffice") {
      const { renderBackofficeView } = await import("./views/backoffice-view");
      if (gen !== viewRenderGen || store.currentView !== view) return;
      viewMount.innerHTML = "";
      renderBackofficeView(viewMount);
    } else if (view === "client") {
      const { renderClientView } = await import("./views/client-view");
      if (gen !== viewRenderGen || store.currentView !== view) return;
      viewMount.innerHTML = "";
      renderClientView(viewMount);
    }
  } catch (err) {
    if (gen !== viewRenderGen) return;
    console.error(err);
    viewMount.innerHTML = `<p class="app-loading" style="padding: var(--space-6); color: var(--color-text-muted);">View konnte nicht geladen werden.</p>`;
  }
}

function renderApp(): void {
  const viewChanged = lastView !== null && lastView !== store.currentView;
  lastView = store.currentView;

  const chromeSig = getChromeSignature();
  if (chromeSig !== lastChromeSig) {
    lastChromeSig = chromeSig;
    renderChrome();
  }

  // Clear viewport and optionally show onboarding
  viewContainer.innerHTML = "";
  const banner = renderOnboardingBanner(() => renderApp());
  if (banner) {
    viewContainer.appendChild(banner);
  }

  const viewMount = document.createElement("div");
  viewMount.className = viewChanged ? "view-mount view-mount--enter" : "view-mount";
  viewContainer.appendChild(viewMount);

  void mountActiveView(viewMount);

  if (viewChanged) {
    mainContent.focus({ preventScroll: true });
  }
}

// Global Keyboard Shortcuts
window.addEventListener("keydown", (e: KeyboardEvent) => {
  const isCmdOrCtrl = e.metaKey || e.ctrlKey;
  const targetTag = (e.target as HTMLElement)?.tagName?.toLowerCase();
  const isEditing = targetTag === "input" || targetTag === "textarea" || targetTag === "select";

  // Cmd+\ — toggle sidebar (Notion-style)
  if (isCmdOrCtrl && (e.key === "\\" || e.code === "Backslash")) {
    e.preventDefault();
    toggleSidebar();
    store.notify();
    return;
  }

  // Cmd+K Command Palette
  if (isCmdOrCtrl && e.key.toLowerCase() === "k") {
    e.preventDefault();
    commandPalette.open();
    return;
  }

  // Undo / Redo
  if (isCmdOrCtrl && e.key.toLowerCase() === "z") {
    e.preventDefault();
    if (e.shiftKey) {
      store.redo();
    } else {
      store.undo();
    }
  } else if (isCmdOrCtrl && e.key.toLowerCase() === "y") {
    e.preventDefault();
    store.redo();
  } else if (!isEditing) {
    if (e.key === "n" || e.key === "N") {
      e.preventDefault();
      createNewTask();
    } else if (e.key === "d" || e.key === "D") {
      e.preventDefault();
      createNewDoc();
    } else if (e.key === "1") {
      store.currentView = "kanban";
      store.notify();
    } else if (e.key === "2") {
      store.currentView = "list";
      store.notify();
    } else if (e.key === "3") {
      store.currentView = "gantt";
      store.notify();
    } else if (e.key === "4") {
      store.currentView = "docs";
      store.notify();
    } else if (e.key === "5") {
      store.currentView = "backoffice";
      store.notify();
    }
  }
});

// App Bootstrap
async function start() {
  viewContainer.innerHTML = `<div class="app-loading" style="padding: var(--space-8); color: var(--color-text-muted); font-size: var(--font-size-sm);">${t().loading}</div>`;

  try {
    const savedThemeMode = localStorage.getItem("proman_theme_mode");
    if (savedThemeMode === "dark" || savedThemeMode === "light") {
      document.documentElement.setAttribute("data-theme", savedThemeMode);
    }
  } catch {
    /* Safari private / storage blocked */
  }
  themeManager.init();
  initSquircleEngine();
  initSidebarLayout();
  initMobileGestures();
  store.subscribe(renderApp);
  await store.init();
  // First paint: ensure chrome mounts even if signature was empty
  lastChromeSig = "";
  renderApp();
  markAppBooted();

  await registerServiceWorker();
}

start().catch((err) => {
  console.error(err);
  void recoverBrokenShell();
});
