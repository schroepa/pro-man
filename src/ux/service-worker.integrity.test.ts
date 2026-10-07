import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ROOT, readSrc } from "../test/helpers";

describe("service worker — no stale HTML shell on mobile", () => {
  const sw = readFileSync(join(ROOT, "public/sw.js"), "utf8");

  it("uses shell cache v3+", () => {
    expect(sw).toMatch(/const CACHE = "proman-shell-v[3-9]/);
  });

  it("does not cache HTML / navigations (network-only)", () => {
    // Navigation branch must respond with bare fetch — no cache.put nearby
    expect(sw).toMatch(/isNavigation\(req\)[\s\S]*?event\.respondWith\(\s*fetch\(req\)\s*\)/);
    expect(sw).not.toMatch(/cache\.put\(req[\s\S]{0,40}clone[\s\S]{0,80}isNavigation/);
  });

  it("activates waiting workers via SKIP_WAITING message", () => {
    expect(sw).toMatch(/SKIP_WAITING/);
    expect(sw).toMatch(/skipWaiting\(\)/);
  });

  it("registers with updateViaCache none and marks boot for the watchdog", () => {
    const main = readSrc("main.ts");
    const helper = readSrc("utils/service-worker.ts");
    expect(main).toContain("registerServiceWorker");
    expect(main).toContain("markAppBooted");
    expect(helper).toMatch(/updateViaCache:\s*["']none["']/);
    expect(helper).toContain("controllerchange");
  });

  it("ships an inline boot recovery watchdog in index.html", () => {
    const html = readFileSync(join(ROOT, "index.html"), "utf8");
    expect(html).toContain("__PROMAN_BOOTED__");
    expect(html).toContain("proman_sw_recovery");
    expect(html).toContain("serviceWorker.getRegistrations");
    expect(html).toContain("caches.delete");
  });

  it("keeps content-visibility off touch phones", () => {
    const board = readSrc("styles/components/board.css");
    const list = readSrc("styles/components/list.css");
    expect(board).toMatch(/@media \(hover: hover\) and \(pointer: fine\)[\s\S]*content-visibility:\s*auto/);
    expect(list).toMatch(/@media \(hover: hover\) and \(pointer: fine\)[\s\S]*content-visibility:\s*auto/);
  });
});
