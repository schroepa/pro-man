import { Task, TaskPriority, TaskStatus } from "../types/task";
import { store } from "../storage/store";
import { t } from "../i18n";
import { TablerIcon } from "../components/icons";
import { showToast } from "../components/toast";
import { CustomSelect } from "../components/custom-select";

type SortKey = "title" | "status" | "priority" | "dueDate";
type SortDir = "asc" | "desc";

let sortKey: SortKey = "dueDate";
let sortDir: SortDir = "asc";
let selectedIds = new Set<string>();

const STATUS_ORDER: Record<TaskStatus, number> = {
  todo: 0,
  "in-progress": 1,
  "in-review": 2,
  done: 3,
};

const PRIORITY_ORDER: Record<TaskPriority, number> = {
  urgent: 0,
  high: 1,
  normal: 2,
  low: 3,
};

export function renderListView(
  container: HTMLElement,
  onOpenTask: (taskId: string) => void,
  onNewTask?: () => void
): void {
  container.innerHTML = "";

  const tasks = [...store.getTasks()];
  sortTasks(tasks);

  // Drop selection entries that are no longer visible
  const visibleIds = new Set(tasks.map(t => t.id));
  selectedIds = new Set([...selectedIds].filter(id => visibleIds.has(id)));

  const wrapper = document.createElement("div");
  wrapper.className = "list-view-container";
  wrapper.setAttribute("role", "region");
  wrapper.setAttribute("aria-label", t().views.list);

  const header = document.createElement("div");
  header.className = "list-view-header";
  header.innerHTML = `
    <div class="list-view-header-left">
      <span class="list-view-title">${t().views.list}</span>
      <span class="list-view-count">${tasks.length} ${t().views.listCount}</span>
    </div>
    <div class="list-view-header-actions">
      <label class="btn btn-secondary list-import-csv-label" for="list-import-csv">
        ${TablerIcon.download({ size: 14 })}
        <span>${t().actions.importCsv}</span>
      </label>
      <input type="file" id="list-import-csv" accept=".csv,text/csv" hidden />
      <button type="button" id="list-export-ics" class="btn btn-secondary" ${tasks.length === 0 ? "disabled" : ""}>
        ${TablerIcon.calendar({ size: 14 })}
        <span>${t().actions.exportIcs}</span>
      </button>
      <button type="button" id="list-export-csv" class="btn btn-secondary" ${tasks.length === 0 ? "disabled" : ""}>
        ${TablerIcon.download({ size: 14 })}
        <span>${t().actions.exportCsv}</span>
      </button>
    </div>
  `;
  header.querySelector("#list-export-csv")?.addEventListener("click", () => {
    exportTasksAsCsv(tasks);
  });
  header.querySelector("#list-export-ics")?.addEventListener("click", () => {
    exportTasksAsIcs(tasks);
  });
  header.querySelector("#list-import-csv")?.addEventListener("change", async (e) => {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const result = await store.importTasksFromCsv(text);
      showToast(`${t().actions.importCsv}: +${result.created} / ~${result.updated}`, "success");
      renderListView(container, onOpenTask);
    } catch (err: any) {
      showToast(err?.message || "CSV-Import fehlgeschlagen", "error");
    } finally {
      input.value = "";
    }
  });
  wrapper.appendChild(header);

  if (tasks.length === 0) {
    const rawCount = store.getAllRawTasks().length;
    const empty = document.createElement("div");
    empty.className = "list-empty-state";
    if (rawCount === 0) {
      empty.innerHTML = `
        <div aria-hidden="true">${TablerIcon.listDetails({ size: 28 })}</div>
        <h3 class="list-empty-title">${t().empty.workspaceTitle}</h3>
        <p class="list-empty-desc">${t().empty.workspaceDesc}</p>
        <button id="list-empty-new-task" class="btn btn-primary" style="margin-top: var(--space-2);">
          ${TablerIcon.plus({ size: 14 })}
          <span>${t().empty.workspaceAction}</span>
        </button>
      `;
      empty.querySelector("#list-empty-new-task")?.addEventListener("click", () => {
        onNewTask?.();
      });
    } else {
      empty.innerHTML = `
        <div aria-hidden="true">${TablerIcon.listDetails({ size: 28 })}</div>
        <h3 class="list-empty-title">${t().list.emptyTitle}</h3>
        <p class="list-empty-desc">${t().list.emptyDesc}</p>
        <button id="list-reset-filters" class="btn btn-primary" style="margin-top: var(--space-2);">
          ${TablerIcon.refresh({ size: 14 })}
          <span>${t().filters.clearFilters}</span>
        </button>
      `;
      empty.querySelector("#list-reset-filters")?.addEventListener("click", () => {
        store.clearFilters();
      });
    }
    wrapper.appendChild(empty);
    container.appendChild(wrapper);
    return;
  }

  // Bulk actions toolbar (visible when selection non-empty)
  if (selectedIds.size > 0) {
    const bulkBar = document.createElement("div");
    bulkBar.className = "list-bulk-toolbar";
    bulkBar.innerHTML = `
      <span class="list-bulk-count">${selectedIds.size} ${t().list.selected}</span>
      <div id="bulk-status-mount" class="list-bulk-select-mount"></div>
      <div id="bulk-priority-mount" class="list-bulk-select-mount"></div>
      <button type="button" id="bulk-clear" class="btn btn-ghost">${t().actions.dismiss}</button>
    `;

    const statusSelect = new CustomSelect({
      options: [
        { value: "", label: `${t().actions.bulkStatus}…` },
        { value: "todo", label: t().statuses.todo },
        { value: "in-progress", label: t().statuses["in-progress"] },
        { value: "in-review", label: t().statuses["in-review"] },
        { value: "done", label: t().statuses.done },
      ],
      selectedValue: "",
      ariaLabel: t().actions.bulkStatus,
      onChange: async (value) => {
        if (!value) return;
        await applyBulkUpdate({ status: value as TaskStatus });
        statusSelect.setValue("");
      },
    });

    const prioritySelect = new CustomSelect({
      options: [
        { value: "", label: `${t().actions.bulkPriority}…` },
        { value: "urgent", label: t().priorities.urgent },
        { value: "high", label: t().priorities.high },
        { value: "normal", label: t().priorities.normal },
        { value: "low", label: t().priorities.low },
      ],
      selectedValue: "",
      ariaLabel: t().actions.bulkPriority,
      onChange: async (value) => {
        if (!value) return;
        await applyBulkUpdate({ priority: value as TaskPriority });
        prioritySelect.setValue("");
      },
    });

    bulkBar.querySelector("#bulk-status-mount")?.appendChild(statusSelect.getElement());
    bulkBar.querySelector("#bulk-priority-mount")?.appendChild(prioritySelect.getElement());

    bulkBar.querySelector("#bulk-clear")?.addEventListener("click", () => {
      selectedIds.clear();
      renderListView(container, onOpenTask);
    });

    wrapper.appendChild(bulkBar);
  }

  const wrap = document.createElement("div");
  wrap.className = "list-table-wrap";

  const allSelected = tasks.length > 0 && tasks.every(t => selectedIds.has(t.id));
  const showAssignee = store.getAllRawTasks().some(task => !!task.assigneeId);

  const table = document.createElement("table");
  table.className = "list-table";
  table.innerHTML = `
    <thead>
      <tr>
        <th scope="col" class="list-cell-check">
          <input type="checkbox" id="list-select-all" ${allSelected ? "checked" : ""} aria-label="${t().actions.selectAll}" title="${t().actions.selectAll}" />
        </th>
        <th scope="col">${t().list.colId}</th>
        ${sortableTh("title", t().tasks.title)}
        ${sortableTh("status", t().filters.status)}
        ${sortableTh("priority", t().filters.priority)}
        ${sortableTh("dueDate", t().tasks.dueDate)}
        <th scope="col">${t().filters.client}</th>
        <th scope="col">${t().filters.project}</th>
        ${showAssignee ? `<th scope="col">${t().filters.assignee}</th>` : ""}
      </tr>
    </thead>
    <tbody>
      ${tasks.map(task => renderRow(task, showAssignee)).join("")}
    </tbody>
  `;

  table.querySelector("#list-select-all")?.addEventListener("change", (e) => {
    e.stopPropagation();
    const checked = (e.target as HTMLInputElement).checked;
    if (checked) {
      tasks.forEach(t => selectedIds.add(t.id));
    } else {
      selectedIds.clear();
    }
    renderListView(container, onOpenTask);
  });

  table.querySelectorAll<HTMLInputElement>("tbody .list-row-check").forEach(cb => {
    cb.addEventListener("click", (e) => e.stopPropagation());
    cb.addEventListener("change", (e) => {
      e.stopPropagation();
      const id = cb.dataset.taskId;
      if (!id) return;
      if (cb.checked) selectedIds.add(id);
      else selectedIds.delete(id);
      renderListView(container, onOpenTask);
    });
  });

  table.querySelectorAll<HTMLElement>("th.sortable").forEach(th => {
    th.addEventListener("click", () => {
      const key = th.dataset.sort as SortKey;
      if (sortKey === key) {
        sortDir = sortDir === "asc" ? "desc" : "asc";
      } else {
        sortKey = key;
        sortDir = "asc";
      }
      renderListView(container, onOpenTask);
    });
  });

  table.querySelectorAll<HTMLElement>("tbody tr").forEach(row => {
    const taskId = row.dataset.taskId;
    if (!taskId) return;
    row.tabIndex = 0;
    row.addEventListener("click", (e) => {
      const target = e.target as HTMLElement;
      if (target.closest("input[type=checkbox]")) return;
      onOpenTask(taskId);
    });
    row.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onOpenTask(taskId);
      }
    });
  });

  wrap.appendChild(table);
  wrapper.appendChild(wrap);
  container.appendChild(wrapper);
}

async function applyBulkUpdate(patch: { status?: TaskStatus; priority?: TaskPriority }): Promise<void> {
  const ids = [...selectedIds];
  let count = 0;
  for (const id of ids) {
    const task = store.getTask(id);
    if (!task) continue;
    await store.saveOrUpdateTask({
      ...task,
      ...patch,
      updatedAt: new Date().toISOString(),
    });
    count++;
  }
  showToast(`${count} ${t().list.bulkUpdated}`, "success");
}

function exportTasksAsCsv(tasks: Task[]): void {
  const headers = ["id", "title", "status", "priority", "dueDate", "startDate", "client", "project", "assignee", "cycle", "tags"];
  const rows = tasks.map(task => {
    const client = task.clientId ? store.getClient(task.clientId) : null;
    const project = task.projectId ? store.getProject(task.projectId) : null;
    const assignee = task.assigneeId ? store.getMember(task.assigneeId) : null;
    return [
      task.id,
      task.title,
      task.status,
      task.priority,
      task.dueDate || "",
      task.startDate || "",
      client?.name || "",
      project?.name || "",
      assignee?.name || "",
      task.cycle || "",
      task.tags.join("; "),
    ].map(csvEscape).join(",");
  });

  const csv = [headers.join(","), ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  downloadBlob(blob, `proman-tasks-${new Date().toISOString().slice(0, 10)}.csv`);
}

function exportTasksAsIcs(tasks: Task[]): void {
  const withDue = tasks.filter(t => t.dueDate);
  if (withDue.length === 0) {
    showToast(t().filters.noDueDate, "warning");
    return;
  }

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//ProMan//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
  ];

  for (const task of withDue) {
    const dtStart = task.dueDate.replace(/-/g, "");
    const endDate = addOneDay(task.dueDate).replace(/-/g, "");
    const summary = icsEscape(task.title);
    const description = icsEscape(task.description || "");
    lines.push("BEGIN:VEVENT");
    lines.push(`UID:${task.id}@proman.local`);
    lines.push(`DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "")}`);
    lines.push(`DTSTART;VALUE=DATE:${dtStart}`);
    lines.push(`DTEND;VALUE=DATE:${endDate}`);
    lines.push(`SUMMARY:${summary}`);
    if (description) lines.push(`DESCRIPTION:${description}`);
    if (task.cycle) lines.push(`CATEGORIES:${icsEscape(task.cycle)}`);
    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");
  const blob = new Blob([lines.join("\r\n")], { type: "text/calendar;charset=utf-8" });
  downloadBlob(blob, `proman-tasks-${new Date().toISOString().slice(0, 10)}.ics`);
}

function addOneDay(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

function icsEscape(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function csvEscape(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function sortableTh(key: SortKey, label: string): string {
  const sorted = sortKey === key;
  const indicator = sorted ? (sortDir === "asc" ? "↑" : "↓") : "";
  return `
    <th scope="col" class="sortable ${sorted ? "sorted" : ""}" data-sort="${key}" aria-sort="${sorted ? (sortDir === "asc" ? "ascending" : "descending") : "none"}">
      ${label}<span class="sort-indicator">${indicator}</span>
    </th>
  `;
}

function renderRow(task: Task, showAssignee: boolean): string {
  const client = task.clientId ? store.getClient(task.clientId) : null;
  const project = task.projectId ? store.getProject(task.projectId) : null;
  const assignee = task.assigneeId ? store.getMember(task.assigneeId) : null;
  const statusLabel = (t().statuses as Record<string, string>)[task.status] || task.status;
  const priorityLabel = t().priorities[task.priority] || task.priority;
  const checked = selectedIds.has(task.id);

  return `
    <tr data-task-id="${task.id}" role="row" class="${checked ? "list-row-selected" : ""}">
      <td class="list-cell-check">
        <input type="checkbox" class="list-row-check" data-task-id="${task.id}" ${checked ? "checked" : ""} aria-label="${escapeHtml(task.title)}" />
      </td>
      <td class="list-cell-id">${escapeHtml(task.issueKey || task.id)}</td>
      <td class="list-cell-title">${escapeHtml(task.title)}</td>
      <td><span class="list-status-badge">${escapeHtml(statusLabel)}</span></td>
      <td><span class="list-priority-badge badge-${task.priority}">${escapeHtml(priorityLabel)}</span></td>
      <td>${escapeHtml(formatDate(task.dueDate))}</td>
      <td>${escapeHtml(client?.name || "—")}</td>
      <td>${escapeHtml(project?.name || "—")}</td>
      ${showAssignee ? `<td>${escapeHtml(assignee?.name || "—")}</td>` : ""}
    </tr>
  `;
}

function sortTasks(tasks: Task[]): void {
  const dir = sortDir === "asc" ? 1 : -1;
  tasks.sort((a, b) => {
    let cmp = 0;
    if (sortKey === "title") {
      cmp = a.title.localeCompare(b.title, undefined, { sensitivity: "base" });
    } else if (sortKey === "status") {
      cmp = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
    } else if (sortKey === "priority") {
      cmp = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
    } else if (sortKey === "dueDate") {
      cmp = (a.dueDate || "").localeCompare(b.dueDate || "");
    }
    return cmp * dir;
  });
}

function formatDate(dateStr: string): string {
  if (!dateStr) return "—";
  const parts = dateStr.split("-");
  if (parts.length === 3) return `${parts[2]}.${parts[1]}.${parts[0]}`;
  return dateStr;
}

function escapeHtml(text: string): string {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}
