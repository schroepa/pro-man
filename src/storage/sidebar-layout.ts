const SIDEBAR_COLLAPSED_KEY = "proman_sidebar_collapsed";
const DESKTOP_MQ = "(min-width: 769px)";

export function isDesktopLayout(): boolean {
  return typeof window !== "undefined" && window.matchMedia(DESKTOP_MQ).matches;
}

export function getSidebarCollapsed(): boolean {
  try {
    return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "1";
  } catch {
    return false;
  }
}

export function setSidebarCollapsed(collapsed: boolean): void {
  try {
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, collapsed ? "1" : "0");
  } catch { /* ignore */ }
  applySidebarLayout();
}

/** True when the sidebar panel is currently visible to the user. */
export function isSidebarVisible(): boolean {
  const root = document.querySelector(".app-root");
  if (!root) return true;
  if (isDesktopLayout()) {
    return !root.classList.contains("sidebar-collapsed");
  }
  return root.classList.contains("sidebar-open");
}

export function applySidebarLayout(): void {
  const root = document.querySelector(".app-root");
  if (!root) return;

  if (isDesktopLayout()) {
    root.classList.toggle("sidebar-collapsed", getSidebarCollapsed());
    root.classList.remove("sidebar-open");
  } else {
    root.classList.remove("sidebar-collapsed");
  }

  syncToggleButtons();
}

export function toggleSidebar(): void {
  const root = document.querySelector(".app-root");
  if (!root) return;

  if (isDesktopLayout()) {
    setSidebarCollapsed(!getSidebarCollapsed());
  } else {
    root.classList.toggle("sidebar-open");
    syncToggleButtons();
  }
}

export function closeMobileSidebar(): void {
  document.querySelector(".app-root")?.classList.remove("sidebar-open");
  syncToggleButtons();
}

export function openSidebar(): void {
  const root = document.querySelector(".app-root");
  if (!root) return;
  if (isDesktopLayout()) {
    setSidebarCollapsed(false);
  } else {
    root.classList.add("sidebar-open");
    syncToggleButtons();
  }
}

function syncToggleButtons(): void {
  const visible = isSidebarVisible();
  document.querySelectorAll<HTMLElement>("[data-sidebar-toggle]").forEach(btn => {
    btn.setAttribute("aria-expanded", String(visible));
    btn.setAttribute("aria-pressed", String(visible));
  });
}

let mqBound = false;

export function initSidebarLayout(): void {
  applySidebarLayout();
  if (mqBound) return;
  mqBound = true;
  const mq = window.matchMedia(DESKTOP_MQ);
  const onChange = () => applySidebarLayout();
  if (typeof mq.addEventListener === "function") {
    mq.addEventListener("change", onChange);
  } else {
    // Safari < 14
    (mq as any).addListener?.(onChange);
  }
}
