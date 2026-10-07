/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { store } from "../storage/store";
import { getChromeSignature } from "../utils/chrome-signature";
import { readSrc, resetStoreMaps } from "../test/helpers";

describe("Performance — notify coalesce & chrome signature", () => {
  beforeEach(() => {
    resetStoreMaps();
  });

  it("coalesces multiple notify() calls into one listener flush", () => {
    const frames: FrameRequestCallback[] = [];
    const raf = vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
      frames.push(cb);
      return frames.length;
    });
    const caf = vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => {});

    const listener = vi.fn();
    const unsub = store.subscribe(listener);

    store.notify();
    store.notify();
    store.notify();
    expect(listener).not.toHaveBeenCalled();
    expect(frames).toHaveLength(1);

    frames[0](0);
    expect(listener).toHaveBeenCalledTimes(1);
    unsub();
    raf.mockRestore();
    caf.mockRestore();
  });

  it("notifySync flushes immediately", () => {
    const frames: FrameRequestCallback[] = [];
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
      frames.push(cb);
      return frames.length;
    });
    vi.spyOn(window, "cancelAnimationFrame").mockImplementation((id) => {
      frames[id - 1] = () => {};
    });

    const listener = vi.fn();
    const unsub = store.subscribe(listener);
    store.notify();
    store.notifySync();
    expect(listener).toHaveBeenCalledTimes(1);
    unsub();
    vi.restoreAllMocks();
  });

  it("chrome signature ignores task body and changes with view/filters", () => {
    const a = getChromeSignature();
    store.currentView = "list";
    const b = getChromeSignature();
    expect(b).not.toBe(a);
    store.filterPriority = "high";
    const c = getChromeSignature();
    expect(c).not.toBe(b);
  });

  it("CSS enables content-visibility for long lists/cards on fine pointers", () => {
    const board = readSrc("styles/components/board.css");
    expect(board).toMatch(/@media \(hover: hover\) and \(pointer: fine\)[\s\S]*\.task-card\s*\{[\s\S]*content-visibility:\s*auto/);
    const list = readSrc("styles/components/list.css");
    expect(list).toMatch(/@media \(hover: hover\) and \(pointer: fine\)[\s\S]*\.list-table tbody tr\s*\{[\s\S]*content-visibility:\s*auto/);
  });

  it("command palette debounces live search notify", async () => {
    vi.useRealTimers();
    vi.useFakeTimers();
    const { CommandPalette } = await import("../components/command-palette");
    const palette = new CommandPalette(() => {}, () => {});
    const listener = vi.fn();
    const unsub = store.subscribe(listener);

    palette.open();
    const input = document.querySelector<HTMLInputElement>(".command-search-input")!;
    input.value = "abc";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.value = "abcd";
    input.dispatchEvent(new Event("input", { bubbles: true }));

    expect(store.searchQuery).not.toBe("abcd");
    vi.advanceTimersByTime(150);
    // rAF coalesce after debounce
    vi.advanceTimersByTime(16);
    expect(store.searchQuery).toBe("abcd");
    expect(listener).toHaveBeenCalled();
    unsub();
    palette.close();
  });
});
