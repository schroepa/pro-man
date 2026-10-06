import { TaskStatus, ColumnDefinition, DEFAULT_COLUMNS } from "../types/task";
import { store } from "../storage/store";
import { createTaskCard } from "../components/task-card";
import { TablerIcon } from "../components/icons";
import { t } from "../i18n";

function dotClassForStatus(id: string): string {
  if (id === "todo") return "column-dot-todo";
  if (id === "in-progress") return "column-dot-progress";
  if (id === "in-review") return "column-dot-review";
  if (id === "done") return "column-dot-done";
  return "column-dot-custom";
}

function emptyLabelForStatus(id: string): string {
  const i18n = t();
  if (id === "todo") return i18n.kanban.emptyTodo;
  if (id === "in-progress") return i18n.kanban.emptyInProgress;
  if (id === "in-review") return i18n.kanban.emptyInReview;
  if (id === "done") return i18n.kanban.emptyDone;
  return "—";
}

function columnTitle(col: ColumnDefinition): string {
  const localized = (t().statuses as Record<string, string>)[col.id];
  return localized || col.name;
}

export function renderKanbanBoard(
  container: HTMLElement,
  onOpenTask: (taskId: string) => void,
  onNewTask: (status: TaskStatus) => void
): void {
  container.innerHTML = "";

  const viewWrapper = document.createElement("div");
  viewWrapper.className = "kanban-view-container";

  const allRawTasks = store.getAllRawTasks();
  const tasks = store.getTasks();
  const i18n = t();
  const columns = store.getActiveColumns();
  // Soft-migrate unknown statuses into the first active column (in-memory)
  store.normalizeStatusesToColumns(columns);

  // Date constants for KPI calculation
  const todayStr = new Date().toISOString().slice(0, 10);
  const nextWeek = new Date();
  nextWeek.setDate(nextWeek.getDate() + 7);
  const nextWeekStr = nextWeek.toISOString().slice(0, 10);

  // Compute live operative metrics (3-Second Rule)
  const totalTasks = allRawTasks.length;
  const openTasks = allRawTasks.filter(task => task.status !== "done").length;
  const inProgressTasks = allRawTasks.filter(task => task.status === "in-progress").length;
  const inReviewTasks = allRawTasks.filter(task => task.status === "in-review").length;
  const doneTasks = allRawTasks.filter(task => task.status === "done").length;
  const overdueTasks = allRawTasks.filter(task => task.status !== "done" && task.dueDate && task.dueDate < todayStr).length;
  const urgentTasks = allRawTasks.filter(task => task.status !== "done" && task.priority === "urgent").length;
  const dueSoonTasks = allRawTasks.filter(task => task.status !== "done" && task.dueDate && task.dueDate >= todayStr && task.dueDate <= nextWeekStr).length;
  const completionRate = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

  // 1. Inverted-Pyramid KPI Overview Bar
  const kpiBar = document.createElement("div");
  kpiBar.className = "dashboard-kpi-bar";
  kpiBar.setAttribute("role", "region");
  kpiBar.setAttribute("aria-label", i18n.kanban.ariaRegion);

  const isUrgentCritical = (overdueTasks + urgentTasks) > 0;

  kpiBar.innerHTML = `
    <div class="kpi-card" tabindex="0" role="button" aria-label="${i18n.kanban.kpiOpen}: ${openTasks}" title="${i18n.kanban.kpiOpen}">
      <div class="kpi-header">
        <span class="kpi-label">${i18n.kanban.kpiOpen}</span>
        <span class="kpi-icon-wrap">${TablerIcon.listCheck({ size: 15 })}</span>
      </div>
      <div class="kpi-value-row">
        <span class="kpi-value">${openTasks}</span>
      </div>
      <span class="kpi-subtext">${inProgressTasks} ${i18n.kanban.kpiInProgress} • ${inReviewTasks} ${i18n.kanban.kpiInReview}</span>
    </div>

    <div class="kpi-card ${isUrgentCritical ? "kpi-card-danger" : "kpi-card-success"}" tabindex="0" role="button" aria-label="${i18n.kanban.kpiUrgent}: ${overdueTasks + urgentTasks}" title="${i18n.kanban.kpiUrgent}">
      <div class="kpi-header">
        <span class="kpi-label">${i18n.kanban.kpiUrgent}</span>
        <span class="kpi-icon-wrap">${TablerIcon.clockAlert({ size: 15 })}</span>
      </div>
      <div class="kpi-value-row">
        <span class="kpi-value">${overdueTasks + urgentTasks}</span>
      </div>
      <span class="kpi-subtext">${isUrgentCritical ? `${overdueTasks} ${i18n.kanban.kpiOverdue} • ${urgentTasks} ${i18n.kanban.kpiUrgentCount}` : i18n.kanban.kpiOnTrack}</span>
    </div>

    <div class="kpi-card" tabindex="0" role="button" aria-label="${i18n.kanban.kpiDueSoon}: ${dueSoonTasks}" title="${i18n.kanban.kpiDueSoon}">
      <div class="kpi-header">
        <span class="kpi-label">${i18n.kanban.kpiDueSoon}</span>
        <span class="kpi-icon-wrap">${TablerIcon.calendarDue({ size: 15 })}</span>
      </div>
      <div class="kpi-value-row">
        <span class="kpi-value">${dueSoonTasks}</span>
      </div>
      <span class="kpi-subtext">${i18n.kanban.kpiDueSoonSub}</span>
    </div>

    <div class="kpi-card" tabindex="0" role="button" aria-label="${i18n.kanban.kpiCompletion} ${completionRate}%" title="${i18n.kanban.kpiCompletion}">
      <div class="kpi-header">
        <span class="kpi-label">${i18n.kanban.kpiCompletion}</span>
        <span class="kpi-icon-wrap">${TablerIcon.circleCheck({ size: 15 })}</span>
      </div>
      <div class="kpi-value-row">
        <span class="kpi-value">${completionRate}%</span>
      </div>
      <span class="kpi-subtext">${doneTasks} ${i18n.kanban.kpiDoneOf} ${totalTasks} ${i18n.kanban.kpiDoneSuffix}</span>
      <div class="kpi-progress-bar" aria-hidden="true">
        <div class="kpi-progress-fill" style="width: ${completionRate}%;"></div>
      </div>
    </div>
  `;

  // Bind interactive filtering to KPI cards
  const kpiActions = [
    () => {
      store.filterStatus = "all";
      store.notify();
    },
    () => {
      store.filterQuick = store.filterQuick === "overdue" ? "all" : "overdue";
      store.notify();
    },
    () => {
      store.filterQuick = store.filterQuick === "due_soon" ? "all" : "due_soon";
      store.notify();
    },
    () => {
      store.filterStatus = store.filterStatus === "done" ? "all" : "done";
      store.notify();
    },
  ];

  const kpiCards = kpiBar.querySelectorAll(".kpi-card");
  kpiCards.forEach((card, index) => {
    const action = kpiActions[index];
    if (!action) return;
    card.addEventListener("click", action);
    card.addEventListener("keydown", (e) => {
      const ke = e as KeyboardEvent;
      if (ke.key === "Enter" || ke.key === " ") {
        ke.preventDefault();
        action();
      }
    });
  });

  // 2. Kanban Board
  const board = document.createElement("div");
  board.className = "kanban-board";
  board.style.setProperty("--kanban-cols", String(Math.max(columns.length, 1)));
  board.setAttribute("role", "region");
  board.setAttribute("aria-label", i18n.kanban.ariaBoard);

  // Truly empty workspace — guide to first task (skip KPI noise)
  if (totalTasks === 0) {
    const emptyBoard = document.createElement("div");
    emptyBoard.className = "board-empty-state";
    emptyBoard.innerHTML = `
      <div class="board-empty-icon" aria-hidden="true">
        ${TablerIcon.layoutKanban({ size: 24 })}
      </div>
      <h3 class="board-empty-title">${i18n.empty.workspaceTitle}</h3>
      <p class="board-empty-desc">${i18n.empty.workspaceDesc}</p>
      <button id="empty-workspace-new-task" class="btn btn-primary" style="margin-top: var(--space-2);">
        ${TablerIcon.plus({ size: 14 })}
        <span>${i18n.empty.workspaceAction}</span>
      </button>
    `;
    emptyBoard.querySelector("#empty-workspace-new-task")?.addEventListener("click", () => {
      onNewTask("todo");
    });
    board.appendChild(emptyBoard);
    viewWrapper.appendChild(board);
    container.appendChild(viewWrapper);
    return;
  }

  viewWrapper.appendChild(kpiBar);

  // Filtered empty — reset filters
  if (tasks.length === 0) {
    const emptyBoard = document.createElement("div");
    emptyBoard.className = "board-empty-state";
    emptyBoard.innerHTML = `
      <div class="board-empty-icon" aria-hidden="true">
        ${TablerIcon.filter({ size: 24 })}
      </div>
      <h3 class="board-empty-title">${i18n.kanban.emptyFilteredTitle}</h3>
      <p class="board-empty-desc">${i18n.kanban.emptyFilteredDesc}</p>
      <button id="reset-board-filter-btn" class="btn btn-primary" style="margin-top: var(--space-2);">
        ${TablerIcon.refresh({ size: 14 })}
        <span>${i18n.filters.clearFilters}</span>
      </button>
    `;
    emptyBoard.querySelector("#reset-board-filter-btn")?.addEventListener("click", () => {
      store.clearFilters();
    });
    board.appendChild(emptyBoard);
  } else {
    const activeColumns = columns.length ? columns : DEFAULT_COLUMNS;

    activeColumns.forEach(col => {
      const colTitle = columnTitle(col);
      const colTasks = tasks.filter(task => task.status === col.id);
      const wipExceeded = typeof col.wipLimit === "number" && col.wipLimit > 0 && colTasks.length > col.wipLimit;

      const section = document.createElement("section");
      section.className = `kanban-column${wipExceeded ? " wip-exceeded" : ""}`;
      section.dataset.status = col.id;
      section.setAttribute("aria-labelledby", `col-title-${col.id}`);

      // Header
      const header = document.createElement("header");
      header.className = "kanban-column-header";
      const wipLabel = typeof col.wipLimit === "number" && col.wipLimit > 0
        ? `${colTasks.length}/${col.wipLimit}`
        : String(colTasks.length);
      header.innerHTML = `
        <div class="column-title-group">
          <span class="column-dot ${dotClassForStatus(col.id)}" style="${col.color && !dotClassForStatus(col.id).startsWith("column-dot-todo") && col.id !== "todo" && col.id !== "in-progress" && col.id !== "in-review" && col.id !== "done" ? `background-color: ${escapeAttr(col.color)}` : ""}" aria-hidden="true"></span>
          <h2 id="col-title-${col.id}" class="column-title">${escapeHtml(colTitle)}</h2>
          <span class="column-count${wipExceeded ? " column-count-wip-warn" : ""}" aria-label="${wipLabel}">${wipLabel}</span>
        </div>
        <button class="btn btn-ghost btn-icon" aria-label="${i18n.kanban.addTask}: ${escapeAttr(colTitle)}" title="${i18n.actions.newTask}">
          ${TablerIcon.plus({ size: 14, strokeWidth: 2 })}
        </button>
      `;

      const addBtn = header.querySelector("button")!;
      addBtn.addEventListener("click", () => onNewTask(col.id));

      // List
      const list = document.createElement("ol");
      list.className = "task-list";
      list.setAttribute("role", "list");
      list.setAttribute("aria-label", colTitle);

      if (colTasks.length === 0) {
        const emptyState = document.createElement("div");
        emptyState.className = "column-empty-state";
        const emptyIcon = col.id === "done"
          ? TablerIcon.circleCheck({ size: 22 })
          : col.id === "in-review"
            ? TablerIcon.eye({ size: 22 })
            : col.id === "in-progress"
              ? TablerIcon.loader({ size: 22 })
              : TablerIcon.circle({ size: 22 });

        emptyState.innerHTML = `
          <div class="column-empty-icon" aria-hidden="true">${emptyIcon}</div>
          <span class="column-empty-title">${escapeHtml(emptyLabelForStatus(col.id))}</span>
          ${col.id !== "done" ? `
            <button class="btn btn-ghost column-empty-action" style="font-size: 0.6875rem; padding: 2px 8px;">
              ${TablerIcon.plus({ size: 12 })}
              <span>${i18n.kanban.addTask}</span>
            </button>
          ` : ""}
        `;

        emptyState.querySelector(".column-empty-action")?.addEventListener("click", () => {
          onNewTask(col.id);
        });

        list.appendChild(emptyState);
      } else {
        colTasks.forEach((task, index) => {
          const card = createTaskCard(task, onOpenTask, { tabIndex: index === 0 ? 0 : -1 });
          list.appendChild(card);
        });
      }

      // Drop zone and visual priority reordering handlers
      let dropTargetIndex = -1;

      list.addEventListener("dragover", (e) => {
        e.preventDefault();
        section.classList.add("drag-over");
        if (e.dataTransfer) {
          e.dataTransfer.dropEffect = "move";
        }

        const cards = Array.from(list.querySelectorAll<HTMLElement>(".task-card"));
        cards.forEach(c => c.classList.remove("drag-target-above", "drag-target-below"));

        let closestIndex = cards.length;
        for (let i = 0; i < cards.length; i++) {
          const box = cards[i].getBoundingClientRect();
          const offset = e.clientY - box.top - box.height / 2;
          if (offset < 0) {
            closestIndex = i;
            cards[i].classList.add("drag-target-above");
            break;
          }
        }
        if (closestIndex === cards.length && cards.length > 0) {
          cards[cards.length - 1].classList.add("drag-target-below");
        }
        dropTargetIndex = closestIndex;
      });

      list.addEventListener("dragleave", (e) => {
        if (!section.contains(e.relatedTarget as Node)) {
          section.classList.remove("drag-over");
          list.querySelectorAll<HTMLElement>(".task-card").forEach(c => c.classList.remove("drag-target-above", "drag-target-below"));
        }
      });

      list.addEventListener("drop", async (e) => {
        e.preventDefault();
        section.classList.remove("drag-over");
        list.querySelectorAll<HTMLElement>(".task-card").forEach(c => c.classList.remove("drag-target-above", "drag-target-below"));

        const taskId = e.dataTransfer?.getData("text/plain");
        if (taskId) {
          const currentIds = colTasks.map(task => task.id).filter(id => id !== taskId);
          const targetIdx = Math.max(0, Math.min(dropTargetIndex, currentIds.length));
          currentIds.splice(targetIdx, 0, taskId);
          await store.reorderTasks(col.id, currentIds);
        }
      });

      // 3. Column Footer CTA
      const footer = document.createElement("div");
      footer.className = "column-footer";
      footer.innerHTML = `
        <button class="column-add-task-btn" aria-label="${i18n.kanban.addTask}: ${escapeAttr(colTitle)}">
          ${TablerIcon.plus({ size: 14, strokeWidth: 2.2 })}
          <span>${i18n.kanban.addTask}</span>
        </button>
      `;
      footer.querySelector("button")?.addEventListener("click", () => onNewTask(col.id));

      section.appendChild(header);
      section.appendChild(list);
      section.appendChild(footer);
      board.appendChild(section);
    });
  }

  viewWrapper.appendChild(board);
  container.appendChild(viewWrapper);
}

function escapeHtml(text: string): string {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function escapeAttr(text: string): string {
  return text.replace(/"/g, "&quot;").replace(/</g, "&lt;");
}
