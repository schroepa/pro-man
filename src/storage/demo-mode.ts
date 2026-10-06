/** Keys & helpers for first-run demo / sample data UX. */

export const DEMO_CLEARED_KEY = "proman_demo_cleared";
export const FIRST_TASK_CELEBRATED_KEY = "proman_first_task_celebrated";

const SAMPLE_TASK_IDS = new Set(["TASK-001", "TASK-002", "TASK-003", "TASK-004"]);
const SAMPLE_DOC_IDS = new Set(["DOC-001", "DOC-002"]);
export const SAMPLE_CLIENT_IDS = new Set(["cli-acme", "cli-techstart", "cli-internal"]);
export const SAMPLE_PROJECT_IDS = new Set([
  "prj-web-redesign",
  "prj-mobile-app",
  "prj-core-dev",
]);

export function isDemoCleared(): boolean {
  try {
    return localStorage.getItem(DEMO_CLEARED_KEY) === "1";
  } catch {
    return false;
  }
}

export function markDemoCleared(): void {
  try {
    localStorage.setItem(DEMO_CLEARED_KEY, "1");
  } catch {
    /* ignore */
  }
}

export function clearDemoClearedFlag(): void {
  try {
    localStorage.removeItem(DEMO_CLEARED_KEY);
  } catch {
    /* ignore */
  }
}

export function isSampleTaskId(id: string): boolean {
  return SAMPLE_TASK_IDS.has(id);
}

export function isSampleDocId(id: string): boolean {
  return SAMPLE_DOC_IDS.has(id);
}

export function isSampleClientId(id: string): boolean {
  return SAMPLE_CLIENT_IDS.has(id);
}

export function isSampleProjectId(id: string): boolean {
  return SAMPLE_PROJECT_IDS.has(id);
}

/** True when at least one seeded sample task or doc is still present. */
export function hasSampleWorkspaceData(
  taskIds: Iterable<string>,
  docIds: Iterable<string> = []
): boolean {
  for (const id of taskIds) {
    if (SAMPLE_TASK_IDS.has(id)) return true;
  }
  for (const id of docIds) {
    if (SAMPLE_DOC_IDS.has(id)) return true;
  }
  return false;
}

/** True when the user has at least one non-sample task. */
export function hasOwnTasks(taskIds: Iterable<string>): boolean {
  for (const id of taskIds) {
    if (!SAMPLE_TASK_IDS.has(id)) return true;
  }
  return false;
}

export function hasCelebratedFirstTask(): boolean {
  try {
    return localStorage.getItem(FIRST_TASK_CELEBRATED_KEY) === "1";
  } catch {
    return true;
  }
}

export function markFirstTaskCelebrated(): void {
  try {
    localStorage.setItem(FIRST_TASK_CELEBRATED_KEY, "1");
  } catch {
    /* ignore */
  }
}
