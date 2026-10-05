import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ROOT } from "../test/helpers";

describe("UX — filter popover positioning after remount", () => {
  it("repositions the open popover after the topbar is appended to the document", () => {
    const src = readFileSync(join(ROOT, "src/components/topbar.ts"), "utf8");
    // Regression: positioning before appendChild made getBoundingClientRect → 0,0 (top-left)
    expect(src).toMatch(/container\.appendChild\(topbar\)[\s\S]*positionFilterPopoverEl/);
    expect(src).toMatch(/if\s*\(!document\.contains\(btn\)\)\s*return/);
    expect(src).toMatch(/requestAnimationFrame\(place\)/);
  });
});
