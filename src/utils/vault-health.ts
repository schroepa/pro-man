/**
 * In-app vault report + lint (read-only), parallel to tools/promantools.
 */
import type { Task } from "../types/task";
import type { Client, Project } from "../types/client";
import type { DocItem } from "../types/doc";

export type LintSeverity = "error" | "warning";

export interface LintIssue {
  severity: LintSeverity;
  code: string;
  message: string;
  ref?: string;
}

export interface OverdueRow {
  key: string;
  title: string;
  dueDate: string;
  daysOverdue: number;
  status: string;
  priority: string;
  client: string;
  project: string;
  cycle: string;
}

export interface CycleBucket {
  cycle: string;
  total: number;
  todo: number;
  inProgress: number;
  inReview: number;
  done: number;
  other: number;
}

export interface TimeRow {
  client: string;
  project: string;
  hours: number;
  estimateHours: number;
  taskCount: number;
}

export interface DigestSection {
  heading: string;
  tasks: Array<{ key: string; title: string; status: string; dueDate: string; client: string }>;
}

export interface VaultHealthSnapshot {
  asOf: string;
  activeCount: number;
  archivedCount: number;
  overdue: OverdueRow[];
  cycles: CycleBucket[];
  timeRows: TimeRow[];
  digest: DigestSection[];
  issues: LintIssue[];
  errorCount: number;
  warningCount: number;
}

export interface VaultHealthInput {
  tasks: Task[];
  archivedTasks?: Task[];
  clients: Client[];
  projects: Project[];
  docs: DocItem[];
}

const WIKILINK_RE = /\[\[([^\]]+)\]\]/g;

/** Local calendar YYYY-MM-DD (avoids UTC shift for week bounds). */
function dayIso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseDay(value: string | undefined | null): string | null {
  if (!value) return null;
  const s = String(value).slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
}

function displayKey(task: Task): string {
  return task.issueKey || task.id;
}

function taskLabel(task: Task): string {
  if (task.issueKey && task.issueKey !== task.id) return `${task.id} / ${task.issueKey}`;
  return task.id;
}

function clientName(clients: Map<string, Client>, id?: string): string {
  if (!id) return "—";
  return clients.get(id)?.name ?? `?${id}`;
}

function projectName(projects: Map<string, Project>, id?: string): string {
  if (!id) return "—";
  return projects.get(id)?.name ?? `?${id}`;
}

export function extractWikilinks(text: string): string[] {
  const out: string[] = [];
  WIKILINK_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = WIKILINK_RE.exec(text || "")) !== null) {
    const title = m[1].trim();
    if (title) out.push(title);
  }
  return out;
}

function totalLoggedHours(task: Task): number {
  const logs = task.timeLogs?.reduce((sum, e) => sum + (Number(e.hours) || 0), 0) ?? 0;
  if (logs > 0) return logs;
  return Number(task.timeSpentHours) || 0;
}

export function computeOverdue(tasks: Task[], clients: Map<string, Client>, projects: Map<string, Project>, asOf: Date): OverdueRow[] {
  const today = dayIso(asOf);
  const rows: OverdueRow[] = [];
  for (const task of tasks) {
    if (task.status === "done" || task.archivedAt) continue;
    const due = parseDay(task.dueDate);
    if (!due || due >= today) continue;
    const days = Math.round((Date.parse(today) - Date.parse(due)) / 86400000);
    rows.push({
      key: displayKey(task),
      title: task.title,
      dueDate: due,
      daysOverdue: days,
      status: task.status,
      priority: task.priority,
      client: clientName(clients, task.clientId),
      project: projectName(projects, task.projectId),
      cycle: task.cycle || "—",
    });
  }
  rows.sort((a, b) => b.daysOverdue - a.daysOverdue || a.dueDate.localeCompare(b.dueDate) || a.key.localeCompare(b.key));
  return rows;
}

export function computeCycleStatus(tasks: Task[]): CycleBucket[] {
  const buckets = new Map<string, CycleBucket>();
  const ensure = (cycle: string): CycleBucket => {
    let b = buckets.get(cycle);
    if (!b) {
      b = { cycle, total: 0, todo: 0, inProgress: 0, inReview: 0, done: 0, other: 0 };
      buckets.set(cycle, b);
    }
    return b;
  };

  for (const task of tasks) {
    if (task.archivedAt) continue;
    const b = ensure(task.cycle || "(ohne Cycle)");
    b.total += 1;
    if (task.status === "todo") b.todo += 1;
    else if (task.status === "in-progress") b.inProgress += 1;
    else if (task.status === "in-review") b.inReview += 1;
    else if (task.status === "done") b.done += 1;
    else b.other += 1;
  }

  return Array.from(buckets.values()).sort((a, b) => {
    const aNone = a.cycle === "(ohne Cycle)" ? 1 : 0;
    const bNone = b.cycle === "(ohne Cycle)" ? 1 : 0;
    return aNone - bNone || a.cycle.localeCompare(b.cycle);
  });
}

export function computeTimeByClientProject(
  tasks: Task[],
  clients: Map<string, Client>,
  projects: Map<string, Project>
): TimeRow[] {
  const agg = new Map<string, TimeRow>();
  for (const task of tasks) {
    const client = clientName(clients, task.clientId);
    const project = projectName(projects, task.projectId);
    const key = `${client}\0${project}`;
    let row = agg.get(key);
    if (!row) {
      row = { client, project, hours: 0, estimateHours: 0, taskCount: 0 };
      agg.set(key, row);
    }
    row.hours += totalLoggedHours(task);
    row.estimateHours += Number(task.estimateHours) || 0;
    row.taskCount += 1;
  }

  return Array.from(agg.values())
    .filter(r => r.hours > 0 || r.estimateHours > 0)
    .map(r => ({
      ...r,
      hours: Math.round(r.hours * 100) / 100,
      estimateHours: Math.round(r.estimateHours * 100) / 100,
    }))
    .sort((a, b) => b.hours - a.hours || a.client.localeCompare(b.client) || a.project.localeCompare(b.project));
}

export function computeWeeklyDigest(
  tasks: Task[],
  clients: Map<string, Client>,
  asOf: Date,
  headings: { overdue: string; dueThisWeek: string; inProgress: string; doneThisWeek: string }
): DigestSection[] {
  const today = dayIso(asOf);
  const local = new Date(asOf.getFullYear(), asOf.getMonth(), asOf.getDate());
  const day = local.getDay(); // 0 Sun
  const weekEnd = new Date(local);
  weekEnd.setDate(local.getDate() + (6 - day));
  const weekStart = new Date(weekEnd);
  weekStart.setDate(weekEnd.getDate() - 6);
  const weekStartIso = dayIso(weekStart);
  const weekEndIso = dayIso(weekEnd);

  const overdue: Task[] = [];
  const dueThisWeek: Task[] = [];
  const inProgress: Task[] = [];
  const doneThisWeek: Task[] = [];

  for (const task of tasks) {
    if (task.archivedAt) continue;
    const due = parseDay(task.dueDate);
    if (task.status === "done") {
      const updated = parseDay(task.updatedAt) || due;
      if (updated && updated >= weekStartIso && updated <= weekEndIso) doneThisWeek.push(task);
      continue;
    }
    if (task.status === "in-progress" || task.status === "in-review") inProgress.push(task);
    if (!due) continue;
    if (due < today) overdue.push(task);
    else if (due >= weekStartIso && due <= weekEndIso) dueThisWeek.push(task);
  }

  const mapTasks = (list: Task[]) =>
    list
      .slice()
      .sort((a, b) => (a.dueDate || "9999").localeCompare(b.dueDate || "9999") || displayKey(a).localeCompare(displayKey(b)))
      .map(t => ({
        key: displayKey(t),
        title: t.title,
        status: t.status,
        dueDate: t.dueDate || "—",
        client: clientName(clients, t.clientId),
      }));

  return [
    { heading: headings.overdue, tasks: mapTasks(overdue) },
    { heading: headings.dueThisWeek, tasks: mapTasks(dueThisWeek) },
    { heading: headings.inProgress, tasks: mapTasks(inProgress) },
    { heading: headings.doneThisWeek, tasks: mapTasks(doneThisWeek) },
  ];
}

export function lintVaultData(input: VaultHealthInput): LintIssue[] {
  const issues: LintIssue[] = [];
  const clients = new Map(input.clients.map(c => [c.id, c]));
  const projects = new Map(input.projects.map(p => [p.id, p]));
  const allTasks = [...input.tasks, ...(input.archivedTasks || [])];

  for (const task of allTasks) {
    if (task.clientId && !clients.has(task.clientId)) {
      issues.push({
        severity: "error",
        code: "orphan-client",
        message: `Unbekannte clientId „${task.clientId}“ bei ${taskLabel(task)}`,
        ref: task.id,
      });
    }
    if (task.projectId && !projects.has(task.projectId)) {
      issues.push({
        severity: "error",
        code: "orphan-project",
        message: `Unbekannte projectId „${task.projectId}“ bei ${taskLabel(task)}`,
        ref: task.id,
      });
    }
    if (
      task.projectId &&
      task.clientId &&
      projects.has(task.projectId) &&
      projects.get(task.projectId)!.clientId &&
      projects.get(task.projectId)!.clientId !== task.clientId
    ) {
      issues.push({
        severity: "warning",
        code: "client-project-mismatch",
        message: `Projekt „${task.projectId}“ gehört nicht zu Kunde „${task.clientId}“ (${taskLabel(task)})`,
        ref: task.id,
      });
    }
  }

  for (const doc of input.docs) {
    if (doc.clientId && !clients.has(doc.clientId)) {
      issues.push({
        severity: "error",
        code: "orphan-client",
        message: `Unbekannte clientId „${doc.clientId}“ bei Doc ${doc.id}`,
        ref: doc.id,
      });
    }
    if (doc.projectId && !projects.has(doc.projectId)) {
      issues.push({
        severity: "error",
        code: "orphan-project",
        message: `Unbekannte projectId „${doc.projectId}“ bei Doc ${doc.id}`,
        ref: doc.id,
      });
    }
  }

  const byId = new Map<string, string[]>();
  const byIssue = new Map<string, string[]>();
  for (const task of allTasks) {
    byId.set(task.id, [...(byId.get(task.id) || []), task.id]);
    if (task.issueKey) {
      byIssue.set(task.issueKey, [...(byIssue.get(task.issueKey) || []), task.id]);
    }
  }
  for (const [id, refs] of byId) {
    if (refs.length > 1) {
      issues.push({
        severity: "error",
        code: "duplicate-id",
        message: `Doppelte Task-id „${id}“`,
        ref: id,
      });
    }
  }
  for (const [key, refs] of byIssue) {
    if (new Set(refs).size > 1 || refs.length > 1) {
      const unique = [...new Set(refs)];
      if (unique.length > 1) {
        issues.push({
          severity: "error",
          code: "duplicate-issue-key",
          message: `Doppelter issueKey „${key}“ in: ${unique.join(", ")}`,
          ref: key,
        });
      }
    }
  }

  const knownIds = new Set<string>();
  for (const task of allTasks) {
    knownIds.add(task.id);
    if (task.issueKey) knownIds.add(task.issueKey);
  }
  for (const task of allTasks) {
    for (const dep of task.dependencies || []) {
      if (!knownIds.has(dep)) {
        issues.push({
          severity: "warning",
          code: "orphan-dependency",
          message: `Abhängigkeit „${dep}“ nicht gefunden (${taskLabel(task)})`,
          ref: task.id,
        });
      }
    }
  }

  const resolveWiki = (title: string): boolean => {
    const needle = title.toLowerCase();
    if (input.docs.some(d => d.title.toLowerCase() === needle)) return true;
    return input.docs.some(d => d.title.toLowerCase().includes(needle));
  };

  for (const task of allTasks) {
    for (const link of extractWikilinks(task.description || "")) {
      if (!resolveWiki(link)) {
        issues.push({
          severity: "warning",
          code: "broken-wikilink",
          message: `Wikilink [[${link}]] ohne Doc-Treffer (${taskLabel(task)})`,
          ref: task.id,
        });
      }
    }
  }
  for (const doc of input.docs) {
    for (const link of extractWikilinks(doc.content || "")) {
      if (!resolveWiki(link)) {
        issues.push({
          severity: "warning",
          code: "broken-wikilink",
          message: `Wikilink [[${link}]] ohne Doc-Treffer (Doc ${doc.id})`,
          ref: doc.id,
        });
      }
    }
  }

  const rank = (s: LintSeverity) => (s === "error" ? 0 : 1);
  issues.sort((a, b) => rank(a.severity) - rank(b.severity) || a.code.localeCompare(b.code) || a.message.localeCompare(b.message));
  return issues;
}

export function computeVaultHealth(
  input: VaultHealthInput,
  asOf: Date = new Date(),
  digestHeadings = {
    overdue: "Überfällig",
    dueThisWeek: "Fällig diese Woche",
    inProgress: "In Arbeit",
    doneThisWeek: "Erledigt diese Woche",
  }
): VaultHealthSnapshot {
  const clients = new Map(input.clients.map(c => [c.id, c]));
  const projects = new Map(input.projects.map(p => [p.id, p]));
  const active = input.tasks.filter(t => !t.archivedAt);
  const archived = input.archivedTasks || [];
  const allForTime = [...active, ...archived];
  const issues = lintVaultData(input);

  return {
    asOf: dayIso(asOf),
    activeCount: active.length,
    archivedCount: archived.length,
    overdue: computeOverdue(active, clients, projects, asOf),
    cycles: computeCycleStatus(active),
    timeRows: computeTimeByClientProject(allForTime, clients, projects),
    digest: computeWeeklyDigest(active, clients, asOf, digestHeadings),
    issues,
    errorCount: issues.filter(i => i.severity === "error").length,
    warningCount: issues.filter(i => i.severity === "warning").length,
  };
}

export function renderHealthMarkdown(snap: VaultHealthSnapshot): string {
  const lines: string[] = [
    "# ProMan Vault-Report",
    "",
    `- Stand: ${snap.asOf}`,
    `- Tasks aktiv: ${snap.activeCount} · archiviert: ${snap.archivedCount}`,
    "",
    "## Prüfung",
    "",
  ];
  if (snap.issues.length === 0) {
    lines.push("_Keine Findings._", "");
  } else {
    lines.push(`${snap.errorCount} Fehler · ${snap.warningCount} Warnungen`, "");
    for (const issue of snap.issues) {
      lines.push(`- **${issue.severity.toUpperCase()}** \`${issue.code}\`: ${issue.message}`);
    }
    lines.push("");
  }

  lines.push("## Überfällig", "");
  if (!snap.overdue.length) {
    lines.push("_Keine überfälligen offenen Tasks._", "");
  } else {
    lines.push("| Key | Titel | Fällig | Tage | Status | Kunde |", "|---|---|---|---:|---|---|");
    for (const r of snap.overdue) {
      lines.push(`| ${r.key} | ${r.title} | ${r.dueDate} | ${r.daysOverdue} | ${r.status} | ${r.client} |`);
    }
    lines.push("");
  }

  lines.push("## Cycle-Status", "");
  if (!snap.cycles.length) {
    lines.push("_Keine Tasks._", "");
  } else {
    lines.push("| Cycle | Total | Todo | Progress | Review | Done |", "|---|---:|---:|---:|---:|---:|");
    for (const c of snap.cycles) {
      lines.push(`| ${c.cycle} | ${c.total} | ${c.todo} | ${c.inProgress} | ${c.inReview} | ${c.done} |`);
    }
    lines.push("");
  }

  lines.push("## Zeit pro Kunde / Projekt", "");
  if (!snap.timeRows.length) {
    lines.push("_Keine Zeiterfassung / Estimates._", "");
  } else {
    lines.push("| Kunde | Projekt | Gebucht (h) | Estimate (h) | Tasks |", "|---|---|---:|---:|---:|");
    for (const r of snap.timeRows) {
      lines.push(`| ${r.client} | ${r.project} | ${r.hours} | ${r.estimateHours} | ${r.taskCount} |`);
    }
    lines.push("");
  }

  lines.push("## Wochen-Digest", "");
  for (const section of snap.digest) {
    lines.push(`### ${section.heading}`, "");
    if (!section.tasks.length) {
      lines.push("_—_", "");
      continue;
    }
    for (const t of section.tasks) {
      lines.push(`- **${t.key}** ${t.title} (${t.status}, fällig ${t.dueDate}, ${t.client})`);
    }
    lines.push("");
  }

  return lines.join("\n").trimEnd() + "\n";
}

export function renderHealthCsv(snap: VaultHealthSnapshot): string {
  const rows: string[][] = [[
    "kind", "key", "title", "due_date", "days_overdue", "status", "priority",
    "client", "project", "cycle", "hours", "estimate_hours", "task_count", "severity", "code", "message", "as_of",
  ]];
  const esc = (v: string | number) => {
    const s = String(v ?? "");
    return /["\n,]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  for (const r of snap.overdue) {
    rows.push(["overdue", r.key, r.title, r.dueDate, r.daysOverdue, r.status, r.priority, r.client, r.project, r.cycle, "", "", "", "", "", "", snap.asOf].map(esc));
  }
  for (const r of snap.timeRows) {
    rows.push(["time", "", "", "", "", "", "", r.client, r.project, "", r.hours, r.estimateHours, r.taskCount, "", "", "", snap.asOf].map(esc));
  }
  for (const c of snap.cycles) {
    rows.push(["cycle", "", c.cycle, "", "", "", "", "", "", c.cycle, "", "", c.total, "", "", "", snap.asOf].map(esc));
  }
  for (const i of snap.issues) {
    rows.push(["lint", i.ref || "", "", "", "", "", "", "", "", "", "", "", "", i.severity, i.code, i.message, snap.asOf].map(esc));
  }
  return rows.map(r => r.join(",")).join("\n") + "\n";
}

export function downloadTextFile(filename: string, content: string, mime: string): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
