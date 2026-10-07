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
  it("hides closed dialogs and only applies mobile sheet display when open", () => {
    const css = readSrc("styles/components/dialog.css");
    expect(css).toMatch(/dialog\.task-dialog:not\(\[open\]\)\s*\{[\s\S]*?display:\s*none/);
    // Full-height sheet flex must be gated on [open] — bare display:flex overrides UA hide on iPhone
    expect(css).toMatch(/@media \(max-width:\s*640px\)[\s\S]*dialog\.task-dialog\[open\]\s*\{[\s\S]*display:\s*flex/);
    expect(css).not.toMatch(
      /@media \(max-width:\s*640px\)[\s\S]*dialog\.task-dialog\s*\{[\s\S]*display:\s*flex/,
    );
  });
});
