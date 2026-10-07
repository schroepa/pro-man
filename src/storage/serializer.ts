import { Task, TaskPriority, TaskStatus, SchemaOrgAction, Subtask, TimeEntry, TaskComment, TaskAttachment, TaskRecurrence } from "../types/task";

function schemaActionStatus(status: TaskStatus): SchemaOrgAction["actionStatus"] {
  if (status === "done") return "CompletedActionStatus";
  if (status === "todo") return "PotentialActionStatus";
  return "ActiveActionStatus";
}

/** Strip Notion import noise like `auch:swt-webportal` → `swt-webportal`. */
export function normalizeTag(tag: string): string {
  return String(tag || "")
    .trim()
    .replace(/^auch:\s*/i, "")
    .trim();
}

export function normalizeTags(tags: string[] | undefined): string[] {
  if (!tags?.length) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of tags) {
    const tag = normalizeTag(raw);
    if (!tag || seen.has(tag)) continue;
    seen.add(tag);
    out.push(tag);
  }
  return out;
}

/**
 * Converts a Task into Obsidian-friendly Markdown:
 * compact YAML frontmatter (no empty noise) + `# Title` body for human reading.
 * Schema.org stays in `taskToSchemaOrgJsonLd` for the app — not dumped into every vault file.
 */
export function taskToMarkdown(task: Task): string {
  const lines: string[] = ["---"];

  const push = (key: string, value: string | number | boolean) => {
    lines.push(`${key}: ${value}`);
  };
  const pushQuoted = (key: string, value: string) => {
    lines.push(`${key}: ${JSON.stringify(value)}`);
  };

  push("id", task.id);
  if (task.issueKey) pushQuoted("issueKey", task.issueKey);
  pushQuoted("title", task.title);
  push("status", task.status);
  push("priority", task.priority);
  if (task.startDate) push("startDate", task.startDate);
  if (task.dueDate) push("dueDate", task.dueDate);
  if (task.clientId) push("clientId", task.clientId);
  if (task.projectId) push("projectId", task.projectId);
  if (task.assigneeId) push("assigneeId", task.assigneeId);
  push("order", task.order);
  push("createdAt", task.createdAt);
  push("updatedAt", task.updatedAt);

  if (task.archivedAt) push("archivedAt", task.archivedAt);
  if (task.estimateHours !== undefined) push("estimateHours", task.estimateHours);
  if (task.timeSpentHours !== undefined) push("timeSpentHours", task.timeSpentHours);
  if (task.isMilestone !== undefined) push("isMilestone", task.isMilestone);
  if (task.cycle) pushQuoted("cycle", task.cycle);
  if (task.gitUrl) pushQuoted("gitUrl", task.gitUrl);
  if (task.recurrence) push("recurrence", task.recurrence);

  const tags = normalizeTags(task.tags);
  if (tags.length) {
    lines.push("tags:");
    tags.forEach(t => lines.push(`  - ${t}`));
  }

  if (task.dependencies?.length) {
    lines.push("dependencies:");
    task.dependencies.forEach(d => lines.push(`  - ${d}`));
  }

  if (task.attachments?.length) {
    lines.push("attachments:");
    task.attachments.forEach(att => {
      lines.push(`  - id: ${att.id}`);
      lines.push(`    name: ${JSON.stringify(att.name)}`);
      lines.push(`    relativePath: ${JSON.stringify(att.relativePath || "")}`);
    });
  }

  if (task.timeLogs?.length) {
    lines.push("timeLogs:");
    task.timeLogs.forEach(log => {
      lines.push(`  - id: ${log.id}`);
      lines.push(`    hours: ${log.hours}`);
      lines.push(`    date: ${log.date}`);
      if (log.description) lines.push(`    description: ${JSON.stringify(log.description)}`);
      lines.push(`    createdAt: ${log.createdAt}`);
    });
  }

  lines.push("---");
  lines.push("");
  lines.push(`# ${task.title}`);

  const description = task.description.trim();
  if (description) {
    lines.push("");
    lines.push(description);
  }

  if (task.subtasks?.length) {
    lines.push("");
    lines.push("## Checkliste");
    task.subtasks.forEach(sub => {
      const mark = sub.completed ? "x" : " ";
      lines.push(`- [${mark}] ${sub.title} <!-- id:${sub.id} -->`);
    });
  }

  if (task.comments?.length) {
    lines.push("");
    lines.push("## Kommentare");
    task.comments.forEach(c => {
      lines.push(`- **${c.author}** (${c.createdAt}): ${c.body} <!-- id:${c.id} -->`);
    });
  }

  return lines.join("\n") + "\n";
}

/**
 * Parses an Obsidian-compatible Markdown task file with YAML frontmatter into a Task object.
 */
export function markdownToTask(rawContent: string, fallbackId: string): Task {
  const content = rawContent.replace(/\r\n/g, "\n");
  const frontmatterRegex = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/;
  const match = content.match(frontmatterRegex);

  const defaultTask: Task = {
    id: fallbackId,
    title: fallbackId,
    description: "",
    status: "todo",
    priority: "normal",
    startDate: new Date().toISOString().slice(0, 10),
    dueDate: new Date().toISOString().slice(0, 10),
    tags: [],
    dependencies: [],
    subtasks: [],
    order: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  if (!match) {
    defaultTask.description = content.trim();
    return defaultTask;
  }

  const frontmatterStr = match[1];
  let bodyStr = match[2] || "";

  // Simple, resilient YAML parser for standard key-value and list structures
  const lines = frontmatterStr.split("\n");
  let currentKey = "";
  let inSchemaOrg = false;
  const parsedData: Record<string, any> = {};
  const timeLogs: TimeEntry[] = [];
  let currentTimeLog: Partial<TimeEntry> | null = null;
  const attachments: TaskAttachment[] = [];
  let currentAttachment: Partial<TaskAttachment> | null = null;

  const unquoteYaml = (v: string): any => {
    let val: any = v;
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    } else if (!isNaN(Number(val)) && val !== "") {
      val = Number(val);
    } else if (val === "true") val = true;
    else if (val === "false") val = false;
    return val;
  };

  const flushTimeLog = () => {
    if (currentTimeLog && currentTimeLog.id && currentTimeLog.hours !== undefined && currentTimeLog.date && currentTimeLog.createdAt) {
      timeLogs.push(currentTimeLog as TimeEntry);
    }
    currentTimeLog = null;
  };

  const flushAttachment = () => {
    if (currentAttachment && currentAttachment.id && currentAttachment.name) {
      attachments.push({
        id: String(currentAttachment.id),
        name: String(currentAttachment.name),
        relativePath: String(currentAttachment.relativePath || ""),
      });
    }
    currentAttachment = null;
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    // Detect schemaOrg block and skip nested keys (including @context/@type)
    const leadingSpaces = line.match(/^(\s*)/)?.[1].length ?? 0;
    if (/^schemaOrg\s*:/.test(trimmed) && leadingSpaces === 0) {
      inSchemaOrg = true;
      currentKey = "schemaOrg";
      parsedData.schemaOrg = {};
      continue;
    }
    if (inSchemaOrg) {
      if (leadingSpaces === 0 && trimmed.includes(":") && !trimmed.startsWith("- ")) {
        inSchemaOrg = false;
        // fall through to parse this new top-level key
      } else {
        continue;
      }
    }

    // Skip keys that start with @ (schema.org nested leftovers)
    const tentativeKey = trimmed.includes(":") ? trimmed.slice(0, trimmed.indexOf(":")).trim() : "";
    if (tentativeKey.startsWith("@")) continue;

    // Time log list item start: "- id: ..."
    if (trimmed.startsWith("- ") && currentKey === "timeLogs") {
      flushTimeLog();
      flushAttachment();
      currentTimeLog = {};
      const rest = trimmed.slice(2).trim();
      const colonIdx = rest.indexOf(":");
      if (colonIdx !== -1) {
        const k = rest.slice(0, colonIdx).trim();
        (currentTimeLog as any)[k] = unquoteYaml(rest.slice(colonIdx + 1).trim());
      }
      continue;
    }

    // Attachment list item start
    if (trimmed.startsWith("- ") && currentKey === "attachments") {
      flushTimeLog();
      flushAttachment();
      currentAttachment = {};
      const rest = trimmed.slice(2).trim();
      const colonIdx = rest.indexOf(":");
      if (colonIdx !== -1) {
        const k = rest.slice(0, colonIdx).trim();
        (currentAttachment as any)[k] = unquoteYaml(rest.slice(colonIdx + 1).trim());
      }
      continue;
    }

    // Nested time log / attachment fields
    if ((currentTimeLog || currentAttachment) && leadingSpaces > 0 && trimmed.includes(":") && !trimmed.startsWith("- ")) {
      const colonIdx = trimmed.indexOf(":");
      const k = trimmed.slice(0, colonIdx).trim();
      const v = unquoteYaml(trimmed.slice(colonIdx + 1).trim());
      if (currentTimeLog) (currentTimeLog as any)[k] = v;
      if (currentAttachment) (currentAttachment as any)[k] = v;
      continue;
    }

    // List item inside an array
    if (trimmed.startsWith("- ") && currentKey) {
      const val = trimmed.slice(2).trim();
      if (!Array.isArray(parsedData[currentKey])) {
        parsedData[currentKey] = [];
      }
      parsedData[currentKey].push(val);
      continue;
    }

    // Key-value pair
    const colonIdx = line.indexOf(":");
    if (colonIdx !== -1) {
      const key = line.slice(0, colonIdx).trim();
      const rawVal = line.slice(colonIdx + 1).trim();

      if (key.startsWith("@")) continue;

      flushTimeLog();
      flushAttachment();

      if (rawVal === "[]") {
        currentKey = key;
        parsedData[key] = [];
      } else if (rawVal === "") {
        // Empty scalar (e.g. legacy `dueDate:`) — keep as empty string, not []
        currentKey = key;
        parsedData[key] = "";
      } else {
        currentKey = key;
        parsedData[key] = unquoteYaml(rawVal);
      }
    }
  }
  flushTimeLog();
  flushAttachment();

  // Extract checklist / comments (## or legacy ###)
  const checklistSection = bodyStr.match(/#{2,3} Checkliste\n([\s\S]*?)(?=\n#{2,3} |\n*$)/);
  const commentsSection = bodyStr.match(/#{2,3} Kommentare\n([\s\S]*?)(?=\n#{2,3} |\n*$)/);

  const subtasks: Subtask[] = [];
  const checklistSource = checklistSection ? checklistSection[1] : bodyStr;
  const checklistRegex = /^- \[([ xX])\] (.*?)(?:\s*<!--\s*id:([^\s]+)\s*-->)?\s*$/gm;
  let chkMatch: RegExpExecArray | null;

  while ((chkMatch = checklistRegex.exec(checklistSource)) !== null) {
    const rawTitle = chkMatch[2].replace(/\s*<!--\s*id:[^\s]+\s*-->\s*$/, "").trim();
    subtasks.push({
      id: chkMatch[3] || `sub-${subtasks.length + 1}`,
      title: rawTitle,
      completed: chkMatch[1].toLowerCase() === "x",
    });
  }

  const comments: TaskComment[] = [];
  if (commentsSection) {
    const commentRegex = /^- \*\*(.+?)\*\* \(([^)]+)\):\s*(.*?)(?:\s*<!--\s*id:([^\s]+)\s*-->)?\s*$/gm;
    let cMatch: RegExpExecArray | null;
    while ((cMatch = commentRegex.exec(commentsSection[1])) !== null) {
      comments.push({
        id: cMatch[4] || `cmt-${comments.length + 1}`,
        author: cMatch[1].trim(),
        createdAt: cMatch[2].trim(),
        body: cMatch[3].replace(/\s*<!--\s*id:[^\s]+\s*-->\s*$/, "").trim(),
      });
    }
  }

  // Clean out structured sections + leading H1 (title lives in frontmatter)
  let cleanBody = bodyStr
    .replace(/^\s*#\s+.+\n+/, "")
    .replace(/#{2,3} Checkliste[\s\S]*?(?=\n#{2,3} |$)/, "")
    .replace(/#{2,3} Kommentare[\s\S]*?(?=\n#{2,3} |$)/, "")
    .trim();

  const statusRaw = parsedData.status ? String(parsedData.status) : "todo";
  const recurrenceRaw = parsedData.recurrence ? String(parsedData.recurrence) : "";
  const recurrence: TaskRecurrence | undefined =
    recurrenceRaw === "weekly" || recurrenceRaw === "monthly" ? recurrenceRaw : undefined;

  // Missing/empty dates stay empty — do not invent "today" (would pollute vault on save)
  const startRaw = parsedData.startDate;
  const dueRaw = parsedData.dueDate;
  const startDate =
    typeof startRaw === "string" && startRaw.trim() ? startRaw.trim() : "";
  const dueDate =
    typeof dueRaw === "string" && dueRaw.trim() ? dueRaw.trim() : "";

  return {
    id: String(parsedData.id || fallbackId),
    clientId: parsedData.clientId ? String(parsedData.clientId) : undefined,
    projectId: parsedData.projectId ? String(parsedData.projectId) : undefined,
    assigneeId: parsedData.assigneeId ? String(parsedData.assigneeId) : undefined,
    title: String(parsedData.title || fallbackId),
    description: cleanBody,
    status: statusRaw as TaskStatus,
    priority: (["urgent", "high", "normal", "low"].includes(parsedData.priority) ? parsedData.priority : "normal") as TaskPriority,
    startDate,
    dueDate,
    estimateHours: typeof parsedData.estimateHours === "number" ? parsedData.estimateHours : undefined,
    timeSpentHours: typeof parsedData.timeSpentHours === "number" ? parsedData.timeSpentHours : undefined,
    timeLogs: timeLogs.length > 0 ? timeLogs : undefined,
    isMilestone: typeof parsedData.isMilestone === "boolean" ? parsedData.isMilestone : undefined,
    tags: Array.isArray(parsedData.tags) ? normalizeTags(parsedData.tags.map(String)) : [],
    dependencies: Array.isArray(parsedData.dependencies) ? parsedData.dependencies : [],
    subtasks: subtasks,
    comments: comments.length > 0 ? comments : undefined,
    attachments: attachments.length > 0 ? attachments : undefined,
    recurrence: recurrence || undefined,
    issueKey: parsedData.issueKey ? String(parsedData.issueKey) : undefined,
    cycle: parsedData.cycle ? String(parsedData.cycle) : undefined,
    gitUrl: parsedData.gitUrl ? String(parsedData.gitUrl) : undefined,
    order: typeof parsedData.order === "number" ? parsedData.order : 0,
    createdAt: String(parsedData.createdAt || defaultTask.createdAt),
    updatedAt: String(parsedData.updatedAt || defaultTask.updatedAt),
    archivedAt: parsedData.archivedAt ? String(parsedData.archivedAt) : undefined,
  };
}

/**
 * Generates Schema.org JSON-LD object for embedding in DOM or AI ingestion
 */
export function taskToSchemaOrgJsonLd(task: Task): SchemaOrgAction {
  const priorityCapitalized = (task.priority.charAt(0).toUpperCase() + task.priority.slice(1)) as "Urgent" | "High" | "Normal" | "Low";

  return {
    "@context": "https://schema.org",
    "@type": "PlanAction",
    identifier: task.id,
    name: task.title,
    description: task.description,
    actionStatus: schemaActionStatus(task.status),
    startTime: task.startDate,
    endTime: task.dueDate,
    priority: priorityCapitalized,
    keywords: task.tags,
    subAction: task.subtasks.map(s => ({
      "@type": "Action",
      name: s.title,
      actionStatus: s.completed ? "CompletedActionStatus" : "PotentialActionStatus",
    })),
  };
}
