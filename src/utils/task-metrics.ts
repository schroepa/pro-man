import type { Task } from "../types/task";

export interface TaskMetrics {
  total: number;
  open: number;
  inProgress: number;
  inReview: number;
  done: number;
  overdue: number;
  urgent: number;
  dueSoon: number;
}

export type DashboardKpiAction = "open" | "urgent" | "due_soon" | "in_progress";

function todayIso(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}

function nextWeekIso(now = new Date()): string {
  const d = new Date(now);
  d.setDate(d.getDate() + 7);
  return d.toISOString().slice(0, 10);
}

/** Operative Kennzahlen aus Roh-Tasks (ohne Scope-/Suchfilter). */
export function computeTaskMetrics(tasks: Task[], now = new Date()): TaskMetrics {
  const todayStr = todayIso(now);
  const nextWeekStr = nextWeekIso(now);

  let open = 0;
  let inProgress = 0;
  let inReview = 0;
  let done = 0;
  let overdue = 0;
  let urgent = 0;
  let dueSoon = 0;

  for (const task of tasks) {
    if (task.status === "done") {
      done += 1;
      continue;
    }
    open += 1;
    if (task.status === "in-progress") inProgress += 1;
    if (task.status === "in-review") inReview += 1;
    if (task.priority === "urgent") urgent += 1;
    if (task.dueDate && task.dueDate < todayStr) overdue += 1;
    if (task.dueDate && task.dueDate >= todayStr && task.dueDate <= nextWeekStr) dueSoon += 1;
  }

  return {
    total: tasks.length,
    open,
    inProgress,
    inReview,
    done,
    overdue,
    urgent,
    dueSoon,
  };
}

/**
 * Heute fällig oder überfällig (offen), nach Fälligkeit sortiert, max. `limit`.
 */
export function getAttentionTasks(tasks: Task[], limit = 8, now = new Date()): Task[] {
  const todayStr = todayIso(now);
  return tasks
    .filter(t => t.status !== "done" && t.dueDate && t.dueDate <= todayStr)
    .sort((a, b) => (a.dueDate || "").localeCompare(b.dueDate || ""))
    .slice(0, limit);
}
