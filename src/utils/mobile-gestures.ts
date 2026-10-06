import {
  closeMobileSidebar,
  isDesktopLayout,
  isSidebarVisible,
  openSidebar,
} from "../storage/sidebar-layout";

const EDGE_PX = 24;
const MIN_SWIPE_PX = 56;
const MAX_VERTICAL_RATIO = 0.75;

type TouchTrack = {
  startX: number;
  startY: number;
  mode: "open-edge" | "close-drawer";
};

let bound = false;
let track: TouchTrack | null = null;

function isInteractiveTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  return Boolean(
    target.closest("input, textarea, select, [contenteditable='true'], .custom-select-menu")
  );
}

function onTouchStart(e: TouchEvent): void {
  if (isDesktopLayout()) return;
  if (e.touches.length !== 1) return;
  if (document.querySelector("dialog[open]")) return;
  if (isInteractiveTarget(e.target)) return;

  const t = e.touches[0];
  const drawerOpen = isSidebarVisible();

  if (drawerOpen) {
    track = { startX: t.clientX, startY: t.clientY, mode: "close-drawer" };
    return;
  }

  if (t.clientX <= EDGE_PX) {
    track = { startX: t.clientX, startY: t.clientY, mode: "open-edge" };
  }
}

function onTouchEnd(e: TouchEvent): void {
  if (!track) return;
  const t = e.changedTouches[0];
  if (!t) {
    track = null;
    return;
  }

  const dx = t.clientX - track.startX;
  const dy = t.clientY - track.startY;
  const absDx = Math.abs(dx);
  const absDy = Math.abs(dy);
  const mode = track.mode;
  track = null;

  if (absDx < MIN_SWIPE_PX) return;
  if (absDy > absDx * MAX_VERTICAL_RATIO) return;

  if (mode === "open-edge" && dx > 0) {
    openSidebar();
  } else if (mode === "close-drawer" && dx < 0) {
    closeMobileSidebar();
  }
}

function onTouchCancel(): void {
  track = null;
}

/** Edge-swipe open + swipe-left close for the mobile drawer. */
export function initMobileGestures(): void {
  if (bound) return;
  bound = true;
  window.addEventListener("touchstart", onTouchStart, { passive: true });
  window.addEventListener("touchend", onTouchEnd, { passive: true });
  window.addEventListener("touchcancel", onTouchCancel, { passive: true });
}

/** Test helpers */
export const __mobileGestureTest = {
  EDGE_PX,
  MIN_SWIPE_PX,
  reset() {
    track = null;
  },
  simulateEdgeOpen(startX = 8, endX = 80): void {
    track = { startX, startY: 200, mode: "open-edge" };
    onTouchEnd({
      changedTouches: [{ clientX: endX, clientY: 200 }],
    } as unknown as TouchEvent);
  },
  simulateClose(startX = 200, endX = 80): void {
    track = { startX, startY: 200, mode: "close-drawer" };
    onTouchEnd({
      changedTouches: [{ clientX: endX, clientY: 200 }],
    } as unknown as TouchEvent);
  },
};
