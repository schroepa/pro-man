/**
 * Schema.org Action / PlanAction / ScheduleAction representation
 * Ensures maximum AI-readability, machine-discoverability, and semantic web standard compliance.
 */
export interface SchemaOrgAction {
  "@context": "https://schema.org";
  "@type": "PlanAction" | "ScheduleAction" | "Action";
  identifier: string;
  name: string;
  description: string;
  actionStatus: "PotentialActionStatus" | "ActiveActionStatus" | "CompletedActionStatus" | "FailedActionStatus";
  startTime?: string;
  endTime?: string;
  priority?: "Urgent" | "High" | "Normal" | "Low";
  keywords?: string[];
  subAction?: Array<{
    "@type": "Action";
    name: string;
    actionStatus: "CompletedActionStatus" | "PotentialActionStatus";
  }>;
}

/** Built-in kanban column ids; projects may define additional custom status ids. */
export type DefaultTaskStatus = "todo" | "in-progress" | "in-review" | "done";
export type TaskStatus = DefaultTaskStatus | (string & {});

export type TaskPriority = "urgent" | "high" | "normal" | "low";

export interface ColumnDefinition {
  id: string;
  name: string;
  color: string;
  order: number;
  wipLimit?: number;
}

export const DEFAULT_COLUMNS: ColumnDefinition[] = [
  { id: "todo", name: "Zu erledigen", color: "var(--status-todo-solid)", order: 0 },
  { id: "in-progress", name: "In Bearbeitung", color: "var(--status-progress-solid)", order: 1 },
  { id: "in-review", name: "In Review", color: "var(--status-review-solid)", order: 2 },
  { id: "done", name: "Erledigt", color: "var(--status-done-solid)", order: 3 },
];

export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
}

export interface TimeEntry {
  id: string;
  hours: number;
  date: string; // YYYY-MM-DD
  description?: string;
  createdAt: string;
}

export interface TaskComment {
  id: string;
  author: string;
  body: string;
  createdAt: string;
}

export interface TaskAttachment {
  id: string;
  name: string;
  /** Relative path inside vault, e.g. `attachments/foo.pdf`. Empty when metadata-only. */
  relativePath: string;
}

export type TaskRecurrence = "weekly" | "monthly" | null;

export interface Task {
  id: string;
  clientId?: string;
  projectId?: string;
  assigneeId?: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  startDate: string;  // YYYY-MM-DD
  dueDate: string;    // YYYY-MM-DD
  estimateHours?: number;
  timeSpentHours?: number;
  timeLogs?: TimeEntry[];
  isMilestone?: boolean;
  tags: string[];
  dependencies: string[]; // List of task IDs this task is blocked by
  subtasks: Subtask[];
  comments?: TaskComment[];
  attachments?: TaskAttachment[];
  recurrence?: TaskRecurrence;
  /** Display key like ACM-WEB-12 (client + project + unbounded sequence). */
  issueKey?: string;
  cycle?: string; // Optional sprint/cycle label
  gitUrl?: string; // Optional git branch / PR URL
  order: number;
  createdAt: string;
  updatedAt: string;
  /** Set when moved to vault `tasks/archive/` — not shown on the active board. */
  archivedAt?: string;
}

export interface ProjectMetadata {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  statuses: ColumnDefinition[];
}
