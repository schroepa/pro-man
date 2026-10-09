/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, beforeEach } from "vitest";
import { readSrc } from "../test/helpers";

describe("UX — task dialog select mounts", () => {
  it("declares mounts for every former native select field", () => {
    const src = readSrc("components/task-dialog.ts");
    for (const id of [
      "task-select-client-mount",
      "task-select-project-mount",
      "task-select-status-mount",
      "task-select-priority-mount",
      "task-select-assignee-mount",
      "task-select-recurrence-mount",
    ]) {
      expect(src).toContain(id);
    }
  });

  it("uses essentials-first layout with more-details accordion", () => {
    const src = readSrc("components/task-dialog.ts");
    expect(src).toContain("task-more-details");
    expect(src).toContain("titlePlaceholder");
    expect(src).toContain("dialog-status-chip");
    expect(src).toContain("firstTaskToast");
  });

  it("keeps description in essentials (outside more-details accordion)", () => {
    const src = readSrc("components/task-dialog.ts");
    const descIdx = src.indexOf('id="task-desc-mount"');
    const detailsIdx = src.indexOf('class="task-more-details"');
    expect(descIdx).toBeGreaterThan(-1);
    expect(detailsIdx).toBeGreaterThan(-1);
    expect(descIdx).toBeLessThan(detailsIdx);
    expect(src).toContain("form-group--description");
    expect(src).toContain("md-live-field--task");
  });

  it("mounts a live Markdown description field", () => {
    const src = readSrc("components/task-dialog.ts");
    expect(src).toContain("MarkdownLiveField");
    expect(src).toContain("task-desc-mount");
    expect(src).toContain("descriptionField");
  });

  it("preserves more-details open state across form remounts", () => {
    const src = readSrc("components/task-dialog.ts");
    expect(src).toContain("moreDetailsOpen");
    expect(src).toMatch(/existingDetails\.open/);
    expect(src).toMatch(/detailsEl\?\.addEventListener\("toggle"/);
  });

  it("wires CustomSelect values into collectFormTask", () => {
    const src = readSrc("components/task-dialog.ts");
    expect(src).toMatch(/selectClient\?\.getValue\(\)/);
    expect(src).toMatch(/selectAssignee\?\.getValue\(\)/);
    expect(src).toMatch(/selectRecurrence\?\.getValue\(\)/);
  });

  it("task dialog re-keys new drafts when client/project change", () => {
    const src = readSrc("components/task-dialog.ts");
    expect(src).toContain("assignIssueKeyForNewTask");
    expect(src).toMatch(/currentTaskId === null[\s\S]*assignIssueKeyForNewTask/);
    expect(src).toMatch(/createTaskId\(task\.clientId,\s*task\.projectId\)/);
  });
});

describe("UX — motion tokens available for snappy feedback", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("defines duration and easing tokens used by overlays", () => {
    const tokens = readSrc("styles/tokens.css");
    expect(tokens).toMatch(/--duration-fast:/);
    expect(tokens).toMatch(/--ease-emphasized:/);
    const motion = readSrc("styles/components/motion.css");
    expect(motion).toMatch(/motion-slide-down|@keyframes/);
  });
});

describe("UX — closed task dialog must not cover the mobile viewport", () => {
  it("hides closed dialogs and only applies drawer/sheet flex when open", () => {
    const css = readSrc("styles/components/dialog.css");
    expect(css).toMatch(/dialog\.task-dialog:not\(\[open\]\)\s*\{[\s\S]*?display:\s*none/);
    // Full-height drawer flex must be gated on [open] — bare display:flex overrides UA hide on iPhone
    expect(css).toMatch(/dialog\.task-dialog\[open\]\s*\{[\s\S]*?display:\s*flex/);
    expect(css).toMatch(/inset:\s*0\s+0\s+0\s+auto/);
    expect(css).toMatch(/width:\s*66\.666vw/);
    expect(css).toMatch(/@media \(max-width:\s*1024px\)[\s\S]*width:\s*80vw/);
    expect(css).toMatch(/@media \(max-width:\s*768px\)[\s\S]*width:\s*92vw/);
    expect(css).toMatch(/motion-drawer-in/);
    expect(css).not.toMatch(
      /@media \(max-width:\s*640px\)[\s\S]*dialog\.task-dialog\s*\{[\s\S]*display:\s*flex/,
    );
  });
});
