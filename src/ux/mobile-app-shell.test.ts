/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { readSrc } from "../test/helpers";
import {
  applySidebarLayout,
  closeMobileSidebar,
  initSidebarLayout,
  openSidebar,
  isSidebarVisible,
} from "../storage/sidebar-layout";
import { renderMobileBottomNav } from "../components/mobile-bottom-nav";
import { __mobileGestureTest, initMobileGestures } from "../utils/mobile-gestures";
import { store } from "../storage/store";
import { t } from "../i18n";

function setViewport(width: number): void {
  Object.defineProperty(window, "innerWidth", { configurable: true, value: width });
  window.matchMedia = vi.fn().mockImplementation((query: string) => {
    const min = query.match(/min-width:\s*(\d+)px/);
    const max = query.match(/max-width:\s*(\d+)px/);
    let matches = false;
    if (min) matches = width >= Number(min[1]);
    if (max) matches = width <= Number(max[1]);
    return {
      matches,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
      onchange: null,
    };
  });
}

describe("Mobile app shell", () => {
  beforeEach(() => {
    document.body.innerHTML = `<div class="app-root"></div>`;
    document.body.style.overflow = "";
    document.documentElement.classList.remove("mobile-nav-scroll-lock");
    setViewport(390);
    initSidebarLayout();
    applySidebarLayout();
    __mobileGestureTest.reset();
  });

  afterEach(() => {
    closeMobileSidebar();
    document.body.style.overflow = "";
  });

  it("locks body scroll while mobile drawer is open", () => {
    expect(document.body.style.overflow).toBe("");
    openSidebar();
    expect(isSidebarVisible()).toBe(true);
    expect(document.body.style.overflow).toBe("hidden");
    expect(document.documentElement.classList.contains("mobile-nav-scroll-lock")).toBe(true);
    closeMobileSidebar();
    expect(document.body.style.overflow).toBe("");
  });

  it("Escape closes the mobile drawer", () => {
    openSidebar();
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(isSidebarVisible()).toBe(false);
  });

  it("bottom nav switches views and More opens drawer", () => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    store.currentView = "dashboard";
    renderMobileBottomNav(host);

    const buttons = host.querySelectorAll<HTMLButtonElement>(".mobile-bottom-nav-item");
    expect(buttons.length).toBe(5);
    expect(host.textContent).toContain(t().views.dashboard);
    expect(host.textContent).toContain(t().views.kanban);
    expect(host.textContent).toContain(t().nav.more);

    buttons[2].click(); // Liste (Übersicht · Board · Liste · Docs · Mehr)
    expect(store.currentView).toBe("list");

    buttons[1].click(); // Board
    expect(store.currentView).toBe("kanban");

    buttons[4].click(); // Mehr
    expect(isSidebarVisible()).toBe(true);
  });

  it("edge swipe opens and reverse swipe closes drawer", () => {
    initMobileGestures();
    expect(isSidebarVisible()).toBe(false);
    __mobileGestureTest.simulateEdgeOpen();
    expect(isSidebarVisible()).toBe(true);
    __mobileGestureTest.simulateClose();
    expect(isSidebarVisible()).toBe(false);
  });

  it("CSS hardens dialog sheet, kanban stack, and bottom nav at mobile breakpoints", () => {
    const dialog = readSrc("styles/components/dialog.css");
    expect(dialog).toMatch(/@media \(max-width:\s*640px\)[\s\S]*dialog\.task-dialog[\s\S]*100dvh/);
    expect(dialog).toMatch(/dialog\.task-dialog \.dialog-footer[\s\S]*sticky/);

    const layout = readSrc("styles/components/layout.css");
    expect(layout).toMatch(/@media \(max-width:\s*768px\)[\s\S]*\.kanban-board[\s\S]*overflow-x:\s*hidden/);
    expect(layout).toMatch(/grid-template-columns:\s*1fr\s*!important/);

    const mobileNav = readSrc("styles/components/mobile-nav.css");
    expect(mobileNav).toContain(".mobile-bottom-nav");
    expect(mobileNav).toMatch(/@media \(max-width:\s*768px\)[\s\S]*\.mobile-nav-host[\s\S]*display:\s*block/);
  });
});
