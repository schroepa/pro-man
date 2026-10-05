import { describe, it, expect, beforeEach } from "vitest";
import { store } from "./store";
import type { Task } from "../types/task";

function makeTask(id: string, deps: string[] = []): Task {
  const today = "2026-10-05";
  return {
    id,
    title: id,
    description: "",
    status: "todo",
    priority: "normal",
    startDate: today,
    dueDate: today,
    tags: [],
    dependencies: deps,
    subtasks: [],
    order: 0,
    createdAt: "2026-10-05T10:00:00.000Z",
    updatedAt: "2026-10-05T10:00:00.000Z",
  };
}

function seed(tasks: Task[]): void {
  const map = (store as unknown as { tasks: Map<string, Task> }).tasks;
  map.clear();
  for (const t of tasks) map.set(t.id, t);
}

describe("wouldCreateDependencyCycle", () => {
  beforeEach(() => {
    seed([]);
  });

  it("detects self-dependency", () => {
    expect(store.wouldCreateDependencyCycle("TASK-A", ["TASK-A"])).toBe(true);
  });

  it("detects simple A→B→A cycle", () => {
    seed([makeTask("TASK-A", ["TASK-B"]), makeTask("TASK-B", [])]);
    expect(store.wouldCreateDependencyCycle("TASK-B", ["TASK-A"])).toBe(true);
  });

  it("allows acyclic dependency", () => {
    seed([makeTask("TASK-X", []), makeTask("TASK-Y", [])]);
    expect(store.wouldCreateDependencyCycle("TASK-Y", ["TASK-X"])).toBe(false);
  });

  it("detects longer chain cycle", () => {
    seed([
      makeTask("TASK-1", ["TASK-2"]),
      makeTask("TASK-2", ["TASK-3"]),
      makeTask("TASK-3", []),
    ]);
    expect(store.wouldCreateDependencyCycle("TASK-3", ["TASK-1"])).toBe(true);
  });
});
