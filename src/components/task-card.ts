import { Task } from "../types/task";
import { store } from "../storage/store";
import { announcer } from "../a11y/announcer";
import { TablerIcon } from "./icons";
import { t } from "../i18n";
import { markdownToPlainText } from "../utils/markdown";

export interface TaskCardOptions {
  tabIndex?: number;
}

export function createTaskCard(
  task: Task,
  onOpen: (taskId: string) => void,
  options: TaskCardOptions = {}
): HTMLElement {
  const card = document.createElement("li");
  card.className = "task-card";
  card.role = "listitem";
  card.tabIndex = options.tabIndex ?? 0;
  card.draggable = true;
  card.dataset.taskId = task.id;
  card.setAttribute("aria-grabbed", "false");

  const priorityLabel = t().priorities[task.priority] || task.priority;

  // Schema.org Microdata
  card.setAttribute("itemscope", "");
  card.setAttribute("itemtype", "https://schema.org/PlanAction");

  const totalSubtasks = task.subtasks.length;
  const completedSubtasks = task.subtasks.filter(s => s.completed).length;
  const openSubtasks = task.subtasks.filter(s => !s.completed);
  const visibleOpen = openSubtasks.slice(0, 4);
  const hiddenOpenCount = Math.max(0, openSubtasks.length - visibleOpen.length);

  // Check if overdue
  const todayStr = new Date().toISOString().slice(0, 10);
  const isOverdue = task.status !== "done" && task.dueDate && task.dueDate < todayStr;

  // Priority metadata with redundant encoding (Icon + Text)
  const priorityIcon = {
    urgent: TablerIcon.alertTriangle({ size: 10, strokeWidth: 2.5 }),
    high: TablerIcon.arrowUp({ size: 10, strokeWidth: 2.5 }),
    normal: TablerIcon.minus({ size: 10, strokeWidth: 2.5 }),
    low: TablerIcon.arrowDown({ size: 10, strokeWidth: 2.5 })
  }[task.priority] || "";

  // Client badge / issue key / assignee
  const client = task.clientId ? store.getClient(task.clientId) : null;
  const assignee = task.assigneeId ? store.getMember(task.assigneeId) : null;
  const assigneeInitials = assignee ? initialsFromName(assignee.name) : "";
  const assigneeColor = assignee?.color || "var(--color-primary-500)";
  const displayKey = task.issueKey || task.id;
  const descSnippet = markdownToPlainText(task.description || "");

  const ariaParts = [`${displayKey}: ${task.title}`, priorityLabel];
  if (assignee) ariaParts.push(`${t().tasks.assignee}: ${assignee.name}`);
  card.setAttribute("aria-label", ariaParts.join(", "));

  card.innerHTML = `
    <div class="task-card-header">
      <div class="task-id-group">
        <span class="task-id" itemprop="identifier">${escapeHtml(displayKey)}</span>
        ${client && !task.issueKey ? `<span class="task-client-badge" title="${escapeHtml(client.name)}">${escapeHtml(client.code)}</span>` : ""}
      </div>
      <span class="badge badge-${task.priority}${task.status === "done" ? " badge-muted" : ""}" itemprop="priority">
        <span class="badge-icon" aria-hidden="true">${priorityIcon}</span>
        <span>${priorityLabel}</span>
      </span>
    </div>
    <h3 class="task-title" itemprop="name">${escapeHtml(task.title)}</h3>
    ${descSnippet ? `<p class="task-desc-snippet" itemprop="description">${escapeHtml(descSnippet)}</p>` : ""}
    ${totalSubtasks > 0 ? `
      <div class="task-card-subtasks" role="group" aria-label="${t().tasks.openSubtasks}">
        <div class="task-subtasks-progress" aria-label="${completedSubtasks}/${totalSubtasks}">
          ${TablerIcon.listDetails({ size: 11, strokeWidth: 2 })}
          <span>${completedSubtasks}/${totalSubtasks}</span>
        </div>
        ${visibleOpen.length > 0 ? `
          <ul class="task-card-subtask-list">
            ${visibleOpen.map(s => `
              <li class="task-card-subtask-item">
                <label class="task-card-subtask-label">
                  <input type="checkbox" class="task-card-subtask-check" data-subtask-id="${escapeHtml(s.id)}" aria-label="${escapeHtml(s.title)}" />
                  <span class="task-card-subtask-title">${escapeHtml(s.title)}</span>
                </label>
              </li>
            `).join("")}
          </ul>
          ${hiddenOpenCount > 0 ? `<span class="task-card-subtasks-more">${t().tasks.moreSubtasks.replace("{n}", String(hiddenOpenCount))}</span>` : ""}
        ` : `
          <span class="task-card-subtasks-done">${completedSubtasks}/${totalSubtasks} ✓</span>
        `}
      </div>
    ` : ""}
    <div class="task-card-meta">
      <div class="task-card-meta-left">
        ${assignee ? `
          <span class="task-assignee-chip" title="${escapeHtml(assignee.name)}${assignee.role ? ` · ${escapeHtml(assignee.role)}` : ""}" itemprop="agent">
            <span class="task-assignee-avatar" style="--assignee-color: ${escapeHtml(assigneeColor)}" aria-hidden="true">${escapeHtml(assigneeInitials)}</span>
            <span class="task-assignee-name">${escapeHtml(assignee.name)}</span>
          </span>
        ` : ""}
        <div class="task-tags">
          ${task.tags.map(tag => `<span class="task-tag" itemprop="keywords">${escapeHtml(tag)}</span>`).join("")}
        </div>
      </div>
      <div class="task-card-meta-right">
        ${task.isMilestone ? `
          <span class="milestone-badge" title="${t().tasks.milestone}">
            ${TablerIcon.diamond({ size: 10, strokeWidth: 2.5 })}
            <span>${t().tasks.milestone}</span>
          </span>
        ` : ""}
        ${(task.timeSpentHours || task.estimateHours) ? `
          <span class="task-time-badge" title="${task.timeSpentHours || 0}h / ${task.estimateHours || 0}h">
            ${TablerIcon.clock({ size: 10, strokeWidth: 2 })}
            <span>${task.timeSpentHours || 0}h${task.estimateHours ? `/${task.estimateHours}h` : ""}</span>
          </span>
        ` : ""}
        ${task.dueDate ? `
          <div class="task-date-info ${isOverdue ? "overdue" : ""}">
            <time datetime="${task.dueDate}" itemprop="endTime">${formatDate(task.dueDate)}</time>
          </div>
        ` : ""}
      </div>
    </div>
  `;

  card.querySelectorAll<HTMLInputElement>(".task-card-subtask-check").forEach(check => {
    check.addEventListener("click", (e) => e.stopPropagation());
    check.addEventListener("change", async (e) => {
      e.stopPropagation();
      const subId = check.dataset.subtaskId;
      if (subId) await store.toggleSubtask(task.id, subId);
    });
  });

  card.querySelector(".task-card-subtasks")?.addEventListener("click", (e) => {
    if ((e.target as HTMLElement).closest(".task-card-subtask-check, .task-card-subtask-label")) {
      e.stopPropagation();
    }
  });

  card.addEventListener("click", () => onOpen(task.id));

  card.addEventListener("dragstart", (e) => {
    e.dataTransfer?.setData("text/plain", task.id);
    card.setAttribute("aria-grabbed", "true");
    card.classList.add("dragging");
    announcer.announce(`${task.title}`);
  });

  card.addEventListener("dragend", () => {
    card.setAttribute("aria-grabbed", "false");
    card.classList.remove("dragging");
  });

  card.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      onOpen(task.id);
    } else if (e.key === " ") {
      e.preventDefault();
      const isGrabbed = card.getAttribute("aria-grabbed") === "true";
      card.setAttribute("aria-grabbed", String(!isGrabbed));
      if (!isGrabbed) {
        announcer.announce(task.title);
      }
    } else if (card.getAttribute("aria-grabbed") === "true") {
      const statuses = store.getActiveColumns().map(c => c.id);
      const currentIdx = statuses.indexOf(task.status);

      if (e.key === "ArrowRight" && currentIdx < statuses.length - 1) {
        e.preventDefault();
        store.updateTaskStatus(task.id, statuses[currentIdx + 1]);
      } else if (e.key === "ArrowLeft" && currentIdx > 0) {
        e.preventDefault();
        store.updateTaskStatus(task.id, statuses[currentIdx - 1]);
      }
    } else if (e.key === "ArrowUp" || e.key === "ArrowDown") {
      // Roving tabindex within column
      const list = card.closest(".task-list");
      if (!list) return;
      const cards = Array.from(list.querySelectorAll<HTMLElement>(".task-card"));
      const idx = cards.indexOf(card);
      if (idx < 0) return;
      const nextIdx = e.key === "ArrowUp" ? idx - 1 : idx + 1;
      if (nextIdx < 0 || nextIdx >= cards.length) return;
      e.preventDefault();
      cards.forEach(c => { c.tabIndex = -1; });
      cards[nextIdx].tabIndex = 0;
      cards[nextIdx].focus();
    }
  });

  return card;
}

function escapeHtml(text: string): string {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return (parts[0] || "?").slice(0, 2).toUpperCase();
}

function formatDate(dateStr: string): string {
  if (!dateStr) return "";
  const parts = dateStr.split("-");
  if (parts.length === 3) {
    return `${parts[2]}.${parts[1]}.`;
  }
  return dateStr;
}
