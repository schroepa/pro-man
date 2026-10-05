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
