import { store } from "../storage/store";
import { t } from "../i18n";
import { TablerIcon } from "../components/icons";

let calendarCursor = new Date();

export function renderCalendarView(
  container: HTMLElement,
  onOpenTask: (taskId: string) => void
): void {
  container.innerHTML = "";

  const year = calendarCursor.getFullYear();
  const month = calendarCursor.getMonth();
  const firstOfMonth = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  // Monday-first: 0=Mon … 6=Sun
  const startWeekday = (firstOfMonth.getDay() + 6) % 7;

  const tasks = store.getTasks().filter(task => task.dueDate);
  const tasksByDate = new Map<string, typeof tasks>();
  for (const task of tasks) {
    const list = tasksByDate.get(task.dueDate) || [];
    list.push(task);
    tasksByDate.set(task.dueDate, list);
  }

  const todayStr = toIsoDate(new Date());
  const monthLabel = calendarCursor.toLocaleDateString(undefined, { month: "long", year: "numeric" });

  const wrapper = document.createElement("div");
  wrapper.className = "calendar-view-container";
  wrapper.setAttribute("role", "region");
  wrapper.setAttribute("aria-label", t().views.calendar);

  const toolbar = document.createElement("div");
  toolbar.className = "calendar-toolbar";
  toolbar.innerHTML = `
    <div class="calendar-toolbar-left">
      <button type="button" class="btn btn-ghost btn-icon" id="cal-prev" aria-label="${t().calendar.prevMonth}">
        ${TablerIcon.chevronLeft({ size: 16 })}
      </button>
      <h2 class="calendar-month-title">${escapeHtml(monthLabel)}</h2>
      <button type="button" class="btn btn-ghost btn-icon" id="cal-next" aria-label="${t().calendar.nextMonth}">
        ${TablerIcon.chevronRight({ size: 16 })}
      </button>
    </div>
    <button type="button" class="btn btn-secondary" id="cal-today">${t().calendar.today}</button>
  `;

  const weekdays = t().calendar.weekdays;
  const grid = document.createElement("div");
  grid.className = "calendar-grid";
  grid.innerHTML = weekdays.map(d => `<div class="calendar-weekday">${escapeHtml(d)}</div>`).join("");

  const totalCells = Math.ceil((startWeekday + daysInMonth) / 7) * 7;
  for (let i = 0; i < totalCells; i++) {
    const dayNum = i - startWeekday + 1;
    const cell = document.createElement("div");

    if (dayNum < 1 || dayNum > daysInMonth) {
      cell.className = "calendar-cell calendar-cell-outside";
      grid.appendChild(cell);
      continue;
    }

    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
    const dayTasks = tasksByDate.get(dateStr) || [];
    const isToday = dateStr === todayStr;

    cell.className = `calendar-cell ${isToday ? "calendar-cell-today" : ""}`;
    cell.innerHTML = `
      <div class="calendar-day-number">${dayNum}</div>
      <div class="calendar-day-tasks">
        ${dayTasks.slice(0, 4).map(task => `
          <button type="button" class="calendar-task-chip" data-task-id="${escapeHtml(task.id)}" title="${escapeHtml(task.title)}">
            <span class="calendar-task-priority badge-${task.priority}"></span>
            <span>${escapeHtml(task.title)}</span>
          </button>
        `).join("")}
        ${dayTasks.length > 4 ? `<span class="calendar-more">+${dayTasks.length - 4}</span>` : ""}
      </div>
    `;
    grid.appendChild(cell);
  }

  toolbar.querySelector("#cal-prev")?.addEventListener("click", () => {
    calendarCursor = new Date(year, month - 1, 1);
    renderCalendarView(container, onOpenTask);
  });
  toolbar.querySelector("#cal-next")?.addEventListener("click", () => {
    calendarCursor = new Date(year, month + 1, 1);
    renderCalendarView(container, onOpenTask);
  });
  toolbar.querySelector("#cal-today")?.addEventListener("click", () => {
    calendarCursor = new Date();
    renderCalendarView(container, onOpenTask);
  });

  grid.querySelectorAll<HTMLButtonElement>(".calendar-task-chip").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const id = btn.dataset.taskId;
      if (id) onOpenTask(id);
    });
  });

  wrapper.appendChild(toolbar);
  wrapper.appendChild(grid);
  container.appendChild(wrapper);
}

function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function escapeHtml(text: string): string {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}
