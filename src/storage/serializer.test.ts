import { describe, it, expect } from "vitest";
import { taskToMarkdown, markdownToTask } from "./serializer";
import type { Task } from "../types/task";

function sampleTask(overrides: Partial<Task> = {}): Task {
  return {
    id: "TASK-100",
    clientId: "cli-internal",
    projectId: "prj-core-dev",
    assigneeId: "mem-you",
    title: "Serializer Roundtrip",
    description: "Body with **markdown**.",
    status: "in-progress",
    priority: "high",
    startDate: "2026-10-01",
    dueDate: "2026-10-10",
    estimateHours: 4,
    tags: ["core", "test"],
    dependencies: ["TASK-001"],
    subtasks: [
      { id: "s1", title: "Write test", completed: true },
      { id: "s2", title: "Ship it", completed: false },
    ],
    order: 2,
    createdAt: "2026-10-01T10:00:00.000Z",
    updatedAt: "2026-10-05T12:00:00.000Z",
    ...overrides,
  };
}

describe("serializer", () => {
  it("round-trips core task fields through markdown", () => {
    const original = sampleTask();
    const md = taskToMarkdown(original);
    const parsed = markdownToTask(md, "FALLBACK");

    expect(parsed.id).toBe(original.id);
    expect(parsed.clientId).toBe(original.clientId);
    expect(parsed.projectId).toBe(original.projectId);
    expect(parsed.assigneeId).toBe(original.assigneeId);
    expect(parsed.title).toBe(original.title);
    expect(parsed.status).toBe(original.status);
    expect(parsed.priority).toBe(original.priority);
    expect(parsed.startDate).toBe(original.startDate);
    expect(parsed.dueDate).toBe(original.dueDate);
    expect(parsed.estimateHours).toBe(original.estimateHours);
    expect(parsed.tags).toEqual(original.tags);
    expect(parsed.dependencies).toEqual(original.dependencies);
    expect(parsed.order).toBe(original.order);
    expect(parsed.description).toContain("Body with **markdown**.");
    expect(parsed.subtasks).toHaveLength(2);
    expect(parsed.subtasks[0]).toMatchObject({ id: "s1", title: "Write test", completed: true });
    expect(parsed.subtasks[1]).toMatchObject({ id: "s2", title: "Ship it", completed: false });
  });

  it("falls back when frontmatter is missing", () => {
    const parsed = markdownToTask("# Just a title\n\nSome body", "TASK-FALLBACK");
    expect(parsed.id).toBe("TASK-FALLBACK");
    expect(parsed.description).toContain("Just a title");
    expect(parsed.status).toBe("todo");
  });

  it("round-trips cycle and gitUrl", () => {
    const original = sampleTask({
      cycle: "Sprint 12",
      gitUrl: "https://github.com/org/repo/tree/feature-x",
    });
    const md = taskToMarkdown(original);
    const parsed = markdownToTask(md, "FALLBACK");
    expect(parsed.cycle).toBe("Sprint 12");
    expect(parsed.gitUrl).toBe("https://github.com/org/repo/tree/feature-x");
  });

  it("omits empty cycle and gitUrl", () => {
    const md = taskToMarkdown(sampleTask({ cycle: undefined, gitUrl: undefined }));
    expect(md).not.toMatch(/^cycle:/m);
    expect(md).not.toMatch(/^gitUrl:/m);
  });

  it("writes a human-readable body with H1 and omits empty noise", () => {
    const md = taskToMarkdown(
      sampleTask({
        assigneeId: undefined,
        tags: [],
        dependencies: [],
        startDate: "",
        dueDate: "2026-10-10",
      })
    );
    expect(md).toContain("# Serializer Roundtrip");
    expect(md).toContain("Body with **markdown**.");
    expect(md).toMatch(/^dueDate: 2026-10-10$/m);
    expect(md).not.toMatch(/^startDate:/m);
    expect(md).not.toMatch(/^assigneeId:/m);
    expect(md).not.toMatch(/^tags:/m);
    expect(md).not.toMatch(/^schemaOrg:/m);
    const parsed = markdownToTask(md, "FALLBACK");
    expect(parsed.title).toBe("Serializer Roundtrip");
    expect(parsed.description).toBe("Body with **markdown**.");
    expect(parsed.description).not.toContain("# Serializer");
  });

  it("round-trips comments via ## Kommentare section", () => {
    const original = sampleTask({
      comments: [
        { id: "c1", author: "Ich", body: "Erste Notiz", createdAt: "2026-10-05T10:00:00.000Z" },
        { id: "c2", author: "Optional", body: "Follow-up", createdAt: "2026-10-05T11:00:00.000Z" },
      ],
    });
    const md = taskToMarkdown(original);
    expect(md).toContain("## Kommentare");
    const parsed = markdownToTask(md, "FALLBACK");
    expect(parsed.comments).toHaveLength(2);
    expect(parsed.comments![0]).toMatchObject({ id: "c1", author: "Ich", body: "Erste Notiz" });
    expect(parsed.comments![1]).toMatchObject({ id: "c2", author: "Optional", body: "Follow-up" });
    expect(parsed.description).toContain("Body with **markdown**.");
    expect(parsed.description).not.toContain("## Kommentare");
  });

  it("still reads legacy ### sections and schemaOrg blocks", () => {
    const legacy = `---
id: LEG-1
title: "Legacy"
status: todo
priority: normal
order: 0
createdAt: 2026-10-01T10:00:00.000Z
updatedAt: 2026-10-01T10:00:00.000Z
schemaOrg:
  "@context": "https://schema.org"
  "@type": "PlanAction"
---

Alte Notiz

### Checkliste
- [x] Done <!-- id:s1 -->

### Kommentare
- **Ich** (2026-10-01T10:00:00.000Z): Hi <!-- id:c1 -->
`;
    const parsed = markdownToTask(legacy, "FALLBACK");
    expect(parsed.description).toBe("Alte Notiz");
    expect(parsed.subtasks).toEqual([{ id: "s1", title: "Done", completed: true }]);
    expect(parsed.comments?.[0]).toMatchObject({ id: "c1", body: "Hi" });
  });

  it("round-trips attachments, recurrence and issueKey", () => {
    const original = sampleTask({
      issueKey: "ACM-12",
      recurrence: "weekly",
      attachments: [
        { id: "a1", name: "spec.pdf", relativePath: "attachments/spec.pdf" },
        { id: "a2", name: "note.txt", relativePath: "" },
      ],
    });
    const md = taskToMarkdown(original);
    expect(md).toMatch(/^issueKey:/m);
    expect(md).toMatch(/^recurrence: weekly/m);
    expect(md).toContain("attachments:");
    const parsed = markdownToTask(md, "FALLBACK");
    expect(parsed.issueKey).toBe("ACM-12");
    expect(parsed.recurrence).toBe("weekly");
    expect(parsed.attachments).toHaveLength(2);
    expect(parsed.attachments![0]).toMatchObject({
      id: "a1",
      name: "spec.pdf",
      relativePath: "attachments/spec.pdf",
    });
  });
});
