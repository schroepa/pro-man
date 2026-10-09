import { TaskStatus, ColumnDefinition, DEFAULT_COLUMNS } from "../types/task";
import { store } from "../storage/store";
import { createTaskCard } from "../components/task-card";
import { TablerIcon } from "../components/icons";
import { t } from "../i18n";
import { SAMPLE_CLIENT_IDS } from "../storage/demo-mode";
import { computeTaskMetrics } from "../utils/task-metrics";

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

  const totalTasks = computeTaskMetrics(allRawTasks).total;

  // Kanban Board (KPI-Leiste lebt nur noch auf dem Dashboard)
  const board = document.createElement("div");
  board.className = "kanban-board";
  board.style.setProperty("--kanban-cols", String(Math.max(columns.length, 1)));
  board.setAttribute("role", "region");
  board.setAttribute("aria-label", i18n.kanban.ariaBoard);

  // Truly empty workspace — guide to first task
  if (totalTasks === 0) {
    const emptyBoard = document.createElement("div");
    emptyBoard.className = "board-empty-state";
    emptyBoard.innerHTML = `
      <div class="board-empty-icon" aria-hidden="true">
        ${TablerIcon.layoutKanban({ size: 24 })}
      </div>
      <h3 class="board-empty-title">${i18n.empty.workspaceTitle}</h3>
      <p class="board-empty-desc">${i18n.empty.workspaceDesc}</p>
      <div class="board-empty-actions">
        <button id="empty-workspace-new-task" class="btn btn-primary">
          ${TablerIcon.plus({ size: 14 })}
          <span>${i18n.empty.workspaceAction}</span>
        </button>
        ${store.hasSampleData() || (store.getClients().length > 0 && store.getClients().every(c => SAMPLE_CLIENT_IDS.has(c.id))) ? `
          <button type="button" id="empty-clear-demo" class="btn btn-secondary">
            ${i18n.empty.clearDemo}
          </button>
        ` : ""}
      </div>
    `;
    emptyBoard.querySelector("#empty-workspace-new-task")?.addEventListener("click", () => {
      onNewTask("todo");
    });
    emptyBoard.querySelector("#empty-clear-demo")?.addEventListener("click", async () => {
      await store.clearDemoData();
      const { showToast } = await import("../components/toast");
      showToast(i18n.empty.clearDemoToast, "info");
    });
    board.appendChild(emptyBoard);
    viewWrapper.appendChild(board);
    container.appendChild(viewWrapper);
    return;
  }

  if (store.hasSampleData()) {
    const demoBar = document.createElement("div");
    demoBar.className = "board-demo-banner";
    demoBar.innerHTML = `
      <span class="demo-chip">${i18n.empty.demoBadge}</span>
      <button type="button" id="board-clear-demo" class="btn btn-ghost" style="font-size: var(--font-size-xs);">
        ${i18n.empty.clearDemo}
      </button>
    `;
    demoBar.querySelector("#board-clear-demo")?.addEventListener("click", async () => {
      await store.clearDemoData();
      const { showToast } = await import("../components/toast");
      showToast(i18n.empty.clearDemoToast, "info");
    });
    viewWrapper.appendChild(demoBar);
  }

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
        e.stopPropagation();
        section.classList.remove("drag-over");
        list.querySelectorAll<HTMLElement>(".task-card").forEach(c => c.classList.remove("drag-target-above", "drag-target-below"));

        const taskId = e.dataTransfer?.getData("text/plain");
        if (!taskId) return;
        const currentIds = colTasks.map(task => task.id).filter(id => id !== taskId);
        const targetIdx = Math.max(0, Math.min(dropTargetIndex < 0 ? currentIds.length : dropTargetIndex, currentIds.length));
        currentIds.splice(targetIdx, 0, taskId);
        try {
          await store.reorderTasks(col.id, currentIds);
        } catch (err) {
          console.error("Kanban drop failed", err);
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
