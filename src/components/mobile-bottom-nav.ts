import { store } from "../storage/store";
import { t } from "../i18n";
import { TablerIcon } from "./icons";
import { openSidebar, isDesktopLayout } from "../storage/sidebar-layout";
import type { ViewMode } from "../storage/store";

type NavItem =
  | { kind: "view"; view: ViewMode; label: string; icon: string }
  | { kind: "more"; label: string; icon: string };

function items(): NavItem[] {
  const i18n = t();
  return [
    { kind: "view", view: "kanban", label: i18n.views.kanban, icon: TablerIcon.layoutKanban({ size: 20 }) },
    { kind: "view", view: "list", label: i18n.views.list, icon: TablerIcon.listDetails({ size: 20 }) },
    { kind: "view", view: "gantt", label: i18n.nav.ganttShort, icon: TablerIcon.timeline({ size: 20 }) },
    { kind: "view", view: "docs", label: i18n.nav.docsShort, icon: TablerIcon.fileText({ size: 20 }) },
    { kind: "more", label: i18n.nav.more, icon: TablerIcon.menu({ size: 20 }) },
  ];
}

/**
 * App-like bottom tab bar — only meaningful under the mobile breakpoint (CSS hides on desktop).
 */
export function renderMobileBottomNav(container: HTMLElement): void {
  container.innerHTML = "";

  const nav = document.createElement("nav");
  nav.className = "mobile-bottom-nav";
  nav.setAttribute("aria-label", t().nav.primary);
  nav.dataset.testid = "mobile-bottom-nav";

  const current = store.currentView;
  const moreActive = current === "backoffice" || current === "calendar";

  for (const item of items()) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "mobile-bottom-nav-item";

    if (item.kind === "view") {
      const active = current === item.view;
      btn.classList.toggle("is-active", active);
      btn.setAttribute("aria-current", active ? "page" : "false");
      btn.innerHTML = `
        <span class="mobile-bottom-nav-icon" aria-hidden="true">${item.icon}</span>
        <span class="mobile-bottom-nav-label">${item.label}</span>
      `;
      btn.addEventListener("click", () => {
        if (store.currentView !== item.view) {
          store.currentView = item.view;
          store.notify();
        }
      });
    } else {
      btn.classList.toggle("is-active", moreActive);
      btn.setAttribute("aria-label", item.label);
      btn.innerHTML = `
        <span class="mobile-bottom-nav-icon" aria-hidden="true">${item.icon}</span>
        <span class="mobile-bottom-nav-label">${item.label}</span>
      `;
      btn.addEventListener("click", () => {
        if (!isDesktopLayout()) {
          openSidebar();
        }
      });
    }

    nav.appendChild(btn);
  }

  container.appendChild(nav);
}
