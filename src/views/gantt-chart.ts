import { Task } from "../types/task";
import { store } from "../storage/store";
import { t } from "../i18n";
import { TablerIcon } from "../components/icons";

type GanttZoom = "day" | "week";

let ganttZoom: GanttZoom = "day";
let scrollToTodayAfterRender = false;

function dayWidthForZoom(zoom: GanttZoom): number {
  return zoom === "week" ? 22 : 44;
}

export function renderGanttChart(container: HTMLElement, onOpenTask: (taskId: string) => void): void {
  container.innerHTML = "";

  const tasks = store.getTasks().filter(t => t.startDate && t.dueDate);
  const DAY_WIDTH = dayWidthForZoom(ganttZoom);

  const wrapper = document.createElement("div");
  wrapper.className = "gantt-container";
  wrapper.setAttribute("role", "region");
  wrapper.setAttribute("aria-label", t().views.gantt);

  if (tasks.length === 0) {
    wrapper.innerHTML = `
      <div class="gantt-empty-state">
        <div class="gantt-empty-icon" aria-hidden="true">${TablerIcon.timeline({ size: 28 })}</div>
        <h3 class="gantt-empty-title">Keine datierten Aufgaben</h3>
        <p class="gantt-empty-desc">Aufgaben mit Start- und Fälligkeitsdatum erscheinen hier in der Timeline.</p>
      </div>
    `;
    container.appendChild(wrapper);
    return;
  }

  // Determine timeline date bounds
  const now = new Date();
  let minDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 3);
  let maxDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 21);

  tasks.forEach(t => {
    const s = new Date(t.startDate);
    const d = new Date(t.dueDate);
    if (!isNaN(s.getTime()) && s < minDate) minDate = new Date(s.getFullYear(), s.getMonth(), s.getDate() - 2);
    if (!isNaN(d.getTime()) && d > maxDate) maxDate = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 4);
  });

  const dayList: Date[] = [];
  const cur = new Date(minDate);
  while (cur <= maxDate) {
    dayList.push(new Date(cur));
    cur.setDate(cur.getDate() + 1);
  }

  // Toolbar
  const toolbar = document.createElement("div");
  toolbar.className = "gantt-toolbar";
  toolbar.innerHTML = `
    <div style="display: flex; align-items: center; gap: var(--space-3); flex-wrap: wrap;">
      <span style="font-size: var(--font-size-xs); font-weight: var(--font-weight-semibold); color: var(--color-text-primary);">
        Zeitraum: ${formatDateDisplay(dayList[0])} - ${formatDateDisplay(dayList[dayList.length - 1])}
      </span>
      <span style="font-size: 0.6875rem; color: var(--color-text-muted);">
        (${tasks.length} Aufgaben)
      </span>
      <button type="button" id="gantt-today-btn" class="btn btn-secondary" style="padding: 2px 10px; font-size: 0.6875rem;">
        ${t().gantt.today}
      </button>
      <div class="gantt-zoom-group" role="group" aria-label="${t().gantt.zoom}">
        <button type="button" class="btn btn-ghost gantt-zoom-btn ${ganttZoom === "day" ? "active" : ""}" data-zoom="day" style="padding: 2px 8px; font-size: 0.6875rem;">
          ${t().gantt.zoomDay}
        </button>
        <button type="button" class="btn btn-ghost gantt-zoom-btn ${ganttZoom === "week" ? "active" : ""}" data-zoom="week" style="padding: 2px 8px; font-size: 0.6875rem;">
          ${t().gantt.zoomWeek}
        </button>
      </div>
    </div>
    <div style="font-size: 0.6875rem; color: var(--color-text-secondary); display: flex; gap: var(--space-3);">
      <span style="display: flex; align-items: center; gap: 4px;">
        <span style="width: 8px; height: 8px; background: var(--gantt-bar-normal, #4f46e5); border-radius: 2px;"></span> Normal
      </span>
      <span style="display: flex; align-items: center; gap: 4px;">
        <span style="width: 8px; height: 8px; background: var(--gantt-bar-urgent, #ef4444); border-radius: 2px;"></span> Dringend
      </span>
      <span style="display: flex; align-items: center; gap: 4px;">
        <span style="width: 8px; height: 8px; background: var(--gantt-bar-done, #16a34a); border-radius: 2px;"></span> Erledigt
      </span>
    </div>
  `;

  const main = document.createElement("div");
  main.className = "gantt-main";

  // Sidebar
  const sidebar = document.createElement("div");
  sidebar.className = "gantt-task-sidebar";
  sidebar.innerHTML = `<div class="gantt-sidebar-header">${t().tasks.title}</div>`;

  tasks.forEach(task => {
    const row = document.createElement("div");
    row.className = "gantt-sidebar-row";
    row.innerHTML = `
      <span class="gantt-sidebar-title" title="${escapeHtml(task.title)}">${escapeHtml(task.title)}</span>
      <span class="badge badge-${task.priority}">${task.id}</span>
    `;
    row.addEventListener("click", () => onOpenTask(task.id));
    sidebar.appendChild(row);
  });

  // Timeline
  const timelineWrapper = document.createElement("div");
  timelineWrapper.className = "gantt-timeline-wrapper";

  const timelineHeader = document.createElement("div");
  timelineHeader.className = "gantt-timeline-header";
  timelineHeader.style.width = `${dayList.length * DAY_WIDTH}px`;

  const todayStr = toIsoDate(now);
  let todayIndex = -1;

  dayList.forEach((day, idx) => {
    const col = document.createElement("div");
    const dayStr = toIsoDate(day);
    const isToday = dayStr === todayStr;
    if (isToday) todayIndex = idx;
    const isWeekend = day.getDay() === 0 || day.getDay() === 6;

    col.className = `gantt-day-col ${isToday ? "today" : ""} ${isWeekend ? "weekend" : ""}`;
    col.style.width = `${DAY_WIDTH}px`;
    col.style.minWidth = `${DAY_WIDTH}px`;
    col.innerHTML = `
      <span style="font-weight: var(--font-weight-semibold);">${day.getDate()}</span>
      <span>${getWeekdayName(day.getDay())}</span>
    `;
    timelineHeader.appendChild(col);
  });

  const rowsContainer = document.createElement("div");
  rowsContainer.className = "gantt-rows-container";
  rowsContainer.style.width = `${dayList.length * DAY_WIDTH}px`;

  const svgOverlay = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svgOverlay.setAttribute("class", "gantt-svg-overlay");
  svgOverlay.setAttribute("width", `${dayList.length * DAY_WIDTH}`);
  svgOverlay.setAttribute("height", `${tasks.length * 44}`);

  const taskRowPositions: Map<string, { startX: number; endX: number; y: number }> = new Map();

  tasks.forEach((task, index) => {
    const row = document.createElement("div");
    row.className = "gantt-row";

    dayList.forEach(day => {
      const cell = document.createElement("div");
      const dayStr = toIsoDate(day);
      const isToday = dayStr === todayStr;
      const isWeekend = day.getDay() === 0 || day.getDay() === 6;
      cell.className = `gantt-cell ${isToday ? "today" : ""} ${isWeekend ? "weekend" : ""}`;
      cell.style.width = `${DAY_WIDTH}px`;
      cell.style.minWidth = `${DAY_WIDTH}px`;
      row.appendChild(cell);
    });

    const taskStart = new Date(task.startDate);
    const taskEnd = new Date(task.dueDate);

    const startIndex = Math.max(0, Math.round((taskStart.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24)));
    const durationDays = Math.max(1, Math.round((taskEnd.getTime() - taskStart.getTime()) / (1000 * 60 * 60 * 24)) + 1);

    const leftPx = startIndex * DAY_WIDTH;
    const widthPx = Math.max(DAY_WIDTH - 6, durationDays * DAY_WIDTH - 8);

    const bar = document.createElement("div");
    const priorityClass = task.status === "done" ? "status-done" : `priority-${task.priority}`;
    bar.className = `gantt-bar ${priorityClass}`;
    bar.style.left = `${leftPx}px`;
    bar.style.width = `${widthPx}px`;
    bar.dataset.taskId = task.id;
    bar.title = `${task.title} (${task.startDate} bis ${task.dueDate})`;
    bar.innerHTML = `
      <div class="gantt-bar-handle gantt-bar-handle-start" title="Startdatum verschieben"></div>
      <span style="margin: 0 var(--space-1);">${escapeHtml(task.title)}</span>
      <div class="gantt-bar-handle gantt-bar-handle-end" title="Dauer verlängern / verkürzen"></div>
    `;

    bar.addEventListener("click", (e) => {
      if ((e.target as HTMLElement).classList.contains("gantt-bar-handle")) return;
      onOpenTask(task.id);
    });

    const centerY = index * 44 + 22;
    taskRowPositions.set(task.id, {
      startX: leftPx,
      endX: leftPx + widthPx,
      y: centerY
    });

    // Drag to shift entire date window
    setupGanttBarDrag(bar, task, DAY_WIDTH);

    // Resize start handle (startDate) and end handle (dueDate)
    const leftHandle = bar.querySelector<HTMLElement>(".gantt-bar-handle-start")!;
    const rightHandle = bar.querySelector<HTMLElement>(".gantt-bar-handle-end")!;
    setupGanttBarStartResize(leftHandle, bar, task, DAY_WIDTH);
    setupGanttBarResize(rightHandle, bar, task, DAY_WIDTH);

    row.appendChild(bar);
    rowsContainer.appendChild(row);
  });

  // Render SVG dependency curves
  tasks.forEach(task => {
    if (task.dependencies && task.dependencies.length > 0) {
      task.dependencies.forEach(depId => {
        const fromPos = taskRowPositions.get(depId);
        const toPos = taskRowPositions.get(task.id);
        if (fromPos && toPos) {
          const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
          path.setAttribute("class", "gantt-dep-line");

          const x1 = fromPos.endX;
          const y1 = fromPos.y;
          const x2 = toPos.startX;
          const y2 = toPos.y;

          const midX = (x1 + x2) / 2;
          const d = `M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`;
          path.setAttribute("d", d);
          svgOverlay.appendChild(path);
        }
      });
    }
  });

  rowsContainer.appendChild(svgOverlay);
  timelineWrapper.appendChild(timelineHeader);
  timelineWrapper.appendChild(rowsContainer);

  main.appendChild(sidebar);
  main.appendChild(timelineWrapper);

  wrapper.appendChild(toolbar);
  wrapper.appendChild(main);
  container.appendChild(wrapper);

  // Vertical scroll sync between sidebar task list and timeline rows
  let syncingScroll = false;
  const syncScroll = (source: HTMLElement, target: HTMLElement) => {
    if (syncingScroll) return;
    syncingScroll = true;
    target.scrollTop = source.scrollTop;
    syncingScroll = false;
  };
  sidebar.addEventListener("scroll", () => syncScroll(sidebar, timelineWrapper));
  timelineWrapper.addEventListener("scroll", () => syncScroll(timelineWrapper, sidebar));

  toolbar.querySelector("#gantt-today-btn")?.addEventListener("click", () => {
    if (todayIndex < 0) return;
    const target = todayIndex * DAY_WIDTH - timelineWrapper.clientWidth / 3;
    timelineWrapper.scrollTo({ left: Math.max(0, target), behavior: "smooth" });
  });

  toolbar.querySelectorAll<HTMLButtonElement>(".gantt-zoom-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const zoom = btn.dataset.zoom as GanttZoom;
      if (zoom === ganttZoom) return;
      ganttZoom = zoom;
      scrollToTodayAfterRender = true;
      renderGanttChart(container, onOpenTask);
    });
  });

  if (scrollToTodayAfterRender && todayIndex >= 0) {
    scrollToTodayAfterRender = false;
    const target = todayIndex * DAY_WIDTH - timelineWrapper.clientWidth / 3;
    timelineWrapper.scrollLeft = Math.max(0, target);
  }
}

function setupGanttBarDrag(bar: HTMLElement, task: Task, dayWidth: number): void {
  let startX = 0;
  let initialLeft = 0;
  let isDragging = false;

  const onPointerDown = (e: PointerEvent) => {
    if ((e.target as HTMLElement).classList.contains("gantt-bar-handle")) return;
    isDragging = true;
    startX = e.clientX;
    initialLeft = parseFloat(bar.style.left) || 0;
    bar.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: PointerEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - startX;
    bar.style.left = `${initialLeft + dx}px`;
  };

  const onPointerUp = async (e: PointerEvent) => {
    if (!isDragging) return;
    isDragging = false;
    bar.releasePointerCapture(e.pointerId);

    const currentLeft = parseFloat(bar.style.left) || 0;
    const dayShift = Math.round((currentLeft - initialLeft) / dayWidth);

    if (dayShift !== 0) {
      const s = new Date(task.startDate);
      const d = new Date(task.dueDate);
      s.setDate(s.getDate() + dayShift);
      d.setDate(d.getDate() + dayShift);

      task.startDate = toIsoDate(s);
      task.dueDate = toIsoDate(d);
      await store.saveOrUpdateTask(task);
    } else {
      bar.style.left = `${initialLeft}px`;
    }
  };

  bar.addEventListener("pointerdown", onPointerDown);
  bar.addEventListener("pointermove", onPointerMove);
  bar.addEventListener("pointerup", onPointerUp);
}

// Resize Task Duration via Right Handle (dueDate)
function setupGanttBarResize(handle: HTMLElement, bar: HTMLElement, task: Task, dayWidth: number): void {
  let startX = 0;
  let initialWidth = 0;
  let isResizing = false;

  handle.addEventListener("pointerdown", (e: PointerEvent) => {
    e.stopPropagation();
    isResizing = true;
    startX = e.clientX;
    initialWidth = parseFloat(bar.style.width) || 0;
    handle.setPointerCapture(e.pointerId);
  });

  handle.addEventListener("pointermove", (e: PointerEvent) => {
    if (!isResizing) return;
    const dx = e.clientX - startX;
    const newWidth = Math.max(dayWidth - 6, initialWidth + dx);
    bar.style.width = `${newWidth}px`;
  });

  handle.addEventListener("pointerup", async (e: PointerEvent) => {
    if (!isResizing) return;
    isResizing = false;
    handle.releasePointerCapture(e.pointerId);

    const currentWidth = parseFloat(bar.style.width) || 0;
    const daysDiff = Math.round((currentWidth - initialWidth) / dayWidth);

    if (daysDiff !== 0) {
      const d = new Date(task.dueDate);
      d.setDate(d.getDate() + daysDiff);
      // Ensure due date is not before start date
      const s = new Date(task.startDate);
      if (d >= s) {
        task.dueDate = toIsoDate(d);
        await store.saveOrUpdateTask(task);
      } else {
        bar.style.width = `${initialWidth}px`;
      }
    }
  });
}

// Resize via Left Handle (startDate) — mirrors end handle logic
function setupGanttBarStartResize(handle: HTMLElement, bar: HTMLElement, task: Task, dayWidth: number): void {
  let startX = 0;
  let initialLeft = 0;
  let initialWidth = 0;
  let isResizing = false;

  handle.addEventListener("pointerdown", (e: PointerEvent) => {
    e.stopPropagation();
    isResizing = true;
    startX = e.clientX;
    initialLeft = parseFloat(bar.style.left) || 0;
    initialWidth = parseFloat(bar.style.width) || 0;
    handle.setPointerCapture(e.pointerId);
  });

  handle.addEventListener("pointermove", (e: PointerEvent) => {
    if (!isResizing) return;
    const dx = e.clientX - startX;
    const maxDx = initialWidth - (dayWidth - 6);
    const clampedDx = Math.min(dx, maxDx);
    bar.style.left = `${initialLeft + clampedDx}px`;
    bar.style.width = `${Math.max(dayWidth - 6, initialWidth - clampedDx)}px`;
  });

  handle.addEventListener("pointerup", async (e: PointerEvent) => {
    if (!isResizing) return;
    isResizing = false;
    handle.releasePointerCapture(e.pointerId);

    const currentLeft = parseFloat(bar.style.left) || 0;
    const daysDiff = Math.round((currentLeft - initialLeft) / dayWidth);

    if (daysDiff !== 0) {
      const s = new Date(task.startDate);
      s.setDate(s.getDate() + daysDiff);
      const d = new Date(task.dueDate);
      if (s <= d) {
        task.startDate = toIsoDate(s);
        await store.saveOrUpdateTask(task);
      } else {
        bar.style.left = `${initialLeft}px`;
        bar.style.width = `${initialWidth}px`;
      }
    } else {
      bar.style.left = `${initialLeft}px`;
      bar.style.width = `${initialWidth}px`;
    }
  });
}

function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function formatDateDisplay(d: Date): string {
  return `${d.getDate()}.${d.getMonth() + 1}.${d.getFullYear()}`;
}

function getWeekdayName(dayIndex: number): string {
  const days = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];
  return days[dayIndex];
}

function escapeHtml(text: string): string {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}
