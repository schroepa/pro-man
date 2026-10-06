import { store } from "./storage/store";
import { renderSidebar } from "./components/sidebar";
import { renderTopbar } from "./components/topbar";
import { renderKanbanBoard } from "./views/kanban-board";
import { renderListView } from "./views/list-view";
import { renderGanttChart } from "./views/gantt-chart";
import { renderCalendarView } from "./views/calendar-view";
import { renderDocsView } from "./views/docs-view";
import { renderBackofficeView } from "./views/backoffice-view";
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

const sidebarContainer = document.getElementById("sidebar-container")!;
const topbarContainer = document.getElementById("topbar-container")!;
const viewContainer = document.getElementById("view-container")!;
const mainContent = document.getElementById("main-content")!;
const mobileNavContainer = document.getElementById("mobile-nav-container")!;

const taskDialog = new TaskDialog();

function openTask(taskId: string): void {
  const task = store.getTask(taskId);
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
    title: "Neues Dokument",
    content: "# Neues Dokument\n\nSchreibe Notizen und Spezifikationen...",
    tags: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  store.selectedDocId = newId;
  store.notify();
}

const commandPalette = new CommandPalette(
  () => createNewTask(),
  () => createNewDoc(),
  (taskId) => openTask(taskId)
);

let lastView: string | null = null;

function renderApp(): void {
  const viewChanged = lastView !== null && lastView !== store.currentView;
  lastView = store.currentView;

  // Render Sidebar
  renderSidebar(sidebarContainer);

  // Render Topbar
  renderTopbar(
    topbarContainer,
    () => createNewTask(),
    () => createNewDoc(),
    () => commandPalette.open()
  );

  renderMobileBottomNav(mobileNavContainer);

  // Clear viewport and optionally show onboarding
  viewContainer.innerHTML = "";
  const banner = renderOnboardingBanner(() => renderApp());
  if (banner) {
    viewContainer.appendChild(banner);
  }

  const viewMount = document.createElement("div");
  viewMount.className = viewChanged ? "view-mount view-mount--enter" : "view-mount";
  viewContainer.appendChild(viewMount);

  // Render Viewport
  if (store.currentView === "kanban") {
    renderKanbanBoard(viewMount, openTask, createNewTask);
  } else if (store.currentView === "list") {
    renderListView(viewMount, openTask, () => createNewTask());
  } else if (store.currentView === "gantt") {
    renderGanttChart(viewMount, openTask, createNewTask);
  } else if (store.currentView === "calendar") {
    renderCalendarView(viewMount, openTask);
  } else if (store.currentView === "docs") {
    renderDocsView(viewMount);
  } else if (store.currentView === "backoffice") {
    renderBackofficeView(viewMount);
  }

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

  const savedThemeMode = localStorage.getItem("proman_theme_mode");
  if (savedThemeMode === "dark" || savedThemeMode === "light") {
    document.documentElement.setAttribute("data-theme", savedThemeMode);
  }
  themeManager.init();
  initSquircleEngine();
  initSidebarLayout();
  initMobileGestures();
  store.subscribe(renderApp);
  await store.init();
  renderApp();

  if ("serviceWorker" in navigator) {
    try {
      await navigator.serviceWorker.register("/sw.js");
    } catch {
      // PWA optional — ignore registration failures in preview / file://
    }
  }
}

start();
