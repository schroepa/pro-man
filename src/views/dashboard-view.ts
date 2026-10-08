import { store } from "../storage/store";
import { t } from "../i18n";
import { TablerIcon } from "../components/icons";
import { SAMPLE_CLIENT_IDS } from "../storage/demo-mode";
import {
  computeTaskMetrics,
  getAttentionTasks,
  type DashboardKpiAction,
} from "../utils/task-metrics";

function escapeHtml(text: string): string {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function navigateToList(action: DashboardKpiAction): void {
  store.filterPriority = "all";
  store.filterAssignee = "all";
  store.filterCycle = "";
  store.searchQuery = "";

  if (action === "open") {
    store.filterStatus = "all";
    store.filterQuick = "all";
  } else if (action === "urgent") {
    store.filterStatus = "all";
    store.filterQuick = "overdue";
  } else if (action === "due_soon") {
    store.filterStatus = "all";
    store.filterQuick = "due_soon";
  } else {
    store.filterStatus = "in-progress";
    store.filterQuick = "all";
  }

  store.currentView = "list";
  store.notify();
}

function bindKpiCard(card: Element, action: DashboardKpiAction): void {
  const run = () => navigateToList(action);
  card.addEventListener("click", run);
  card.addEventListener("keydown", (e) => {
    const ke = e as KeyboardEvent;
    if (ke.key === "Enter" || ke.key === " ") {
      ke.preventDefault();
      run();
    }
  });
}

export function renderDashboardView(
  container: HTMLElement,
  onOpenTask: (taskId: string) => void,
  onNewTask: () => void
): void {
  container.innerHTML = "";

  const i18n = t();
  const allRawTasks = store.getAllRawTasks();
  const metrics = computeTaskMetrics(allRawTasks);
  const attention = getAttentionTasks(allRawTasks, 8);
  const isUrgentCritical = metrics.overdue + metrics.urgent > 0;

  const wrapper = document.createElement("div");
  wrapper.className = "dashboard-view";
  wrapper.setAttribute("role", "region");
  wrapper.setAttribute("aria-label", i18n.views.dashboard);

  // Empty workspace — reuse existing first-task CTA
  if (metrics.total === 0) {
    wrapper.innerHTML = `
      <div class="board-empty-state">
        <div class="board-empty-icon" aria-hidden="true">
          ${TablerIcon.layoutDashboard({ size: 24 })}
        </div>
        <h3 class="board-empty-title">${i18n.empty.workspaceTitle}</h3>
        <p class="board-empty-desc">${i18n.empty.workspaceDesc}</p>
        <div class="board-empty-actions">
          <button type="button" id="dashboard-empty-new-task" class="btn btn-primary">
            ${TablerIcon.plus({ size: 14 })}
            <span>${i18n.empty.workspaceAction}</span>
          </button>
          ${store.hasSampleData() || (store.getClients().length > 0 && store.getClients().every(c => SAMPLE_CLIENT_IDS.has(c.id))) ? `
            <button type="button" id="dashboard-clear-demo" class="btn btn-secondary">
              ${i18n.empty.clearDemo}
            </button>
          ` : ""}
        </div>
      </div>
    `;
    wrapper.querySelector("#dashboard-empty-new-task")?.addEventListener("click", () => onNewTask());
    wrapper.querySelector("#dashboard-clear-demo")?.addEventListener("click", async () => {
      await store.clearDemoData();
      const { showToast } = await import("../components/toast");
      showToast(i18n.empty.clearDemoToast, "info");
    });
    container.appendChild(wrapper);
    return;
  }

  const favProject = store.favoriteProjectIds
    .map(id => store.getProject(id))
    .find((p): p is NonNullable<typeof p> => !!p);

  wrapper.innerHTML = `
    <header class="dashboard-header">
      <h1 class="dashboard-title">${i18n.dashboard.title}</h1>
      <p class="dashboard-subtitle">${i18n.dashboard.subtitle}</p>
    </header>

    <div class="dashboard-kpi-bar" role="region" aria-label="${i18n.dashboard.kpiRegion}" data-testid="dashboard-kpi-bar">
      <div class="kpi-card" tabindex="0" role="button" data-kpi="open" aria-label="${i18n.kanban.kpiOpen}: ${metrics.open}" title="${i18n.kanban.kpiOpen}">
        <div class="kpi-header">
          <span class="kpi-label">${i18n.kanban.kpiOpen}</span>
          <span class="kpi-icon-wrap">${TablerIcon.listCheck({ size: 15 })}</span>
        </div>
        <div class="kpi-value-row">
          <span class="kpi-value">${metrics.open}</span>
        </div>
        <span class="kpi-subtext">${metrics.inProgress} ${i18n.kanban.kpiInProgress} • ${metrics.inReview} ${i18n.kanban.kpiInReview}</span>
      </div>

      <div class="kpi-card ${isUrgentCritical ? "kpi-card-danger" : "kpi-card-success"}" tabindex="0" role="button" data-kpi="urgent" aria-label="${i18n.kanban.kpiUrgent}: ${metrics.overdue + metrics.urgent}" title="${i18n.kanban.kpiUrgent}">
        <div class="kpi-header">
          <span class="kpi-label">${i18n.kanban.kpiUrgent}</span>
          <span class="kpi-icon-wrap">${TablerIcon.clockAlert({ size: 15 })}</span>
        </div>
        <div class="kpi-value-row">
          <span class="kpi-value">${metrics.overdue + metrics.urgent}</span>
        </div>
        <span class="kpi-subtext">${isUrgentCritical ? `${metrics.overdue} ${i18n.kanban.kpiOverdue} • ${metrics.urgent} ${i18n.kanban.kpiUrgentCount}` : i18n.kanban.kpiOnTrack}</span>
      </div>

      <div class="kpi-card" tabindex="0" role="button" data-kpi="due_soon" aria-label="${i18n.kanban.kpiDueSoon}: ${metrics.dueSoon}" title="${i18n.kanban.kpiDueSoon}">
        <div class="kpi-header">
          <span class="kpi-label">${i18n.kanban.kpiDueSoon}</span>
          <span class="kpi-icon-wrap">${TablerIcon.calendarDue({ size: 15 })}</span>
        </div>
        <div class="kpi-value-row">
          <span class="kpi-value">${metrics.dueSoon}</span>
        </div>
        <span class="kpi-subtext">${i18n.kanban.kpiDueSoonSub}</span>
      </div>

      <div class="kpi-card" tabindex="0" role="button" data-kpi="in_progress" aria-label="${i18n.dashboard.kpiInProgress}: ${metrics.inProgress}" title="${i18n.dashboard.kpiInProgress}">
        <div class="kpi-header">
          <span class="kpi-label">${i18n.dashboard.kpiInProgress}</span>
          <span class="kpi-icon-wrap">${TablerIcon.loader({ size: 15 })}</span>
        </div>
        <div class="kpi-value-row">
          <span class="kpi-value">${metrics.inProgress}</span>
        </div>
        <span class="kpi-subtext">${i18n.dashboard.kpiInProgressSub}</span>
      </div>
    </div>

    <section class="dashboard-attention" aria-labelledby="dashboard-attention-title">
      <h2 id="dashboard-attention-title" class="dashboard-section-title">${i18n.dashboard.attentionTitle}</h2>
      ${attention.length === 0 ? `
        <p class="dashboard-attention-empty">${i18n.dashboard.attentionEmpty}</p>
      ` : `
        <ul class="dashboard-attention-list" role="list">
          ${attention.map(task => {
            const todayStr = new Date().toISOString().slice(0, 10);
            const overdue = !!(task.dueDate && task.dueDate < todayStr);
            const dueLabel = overdue ? i18n.filters.overdue : i18n.calendar.today;
            return `
              <li>
                <button type="button" class="dashboard-attention-item" data-task-id="${escapeHtml(task.id)}">
                  <span class="dashboard-attention-badge ${overdue ? "is-overdue" : "is-today"}">${dueLabel}</span>
                  <span class="dashboard-attention-key">${escapeHtml(task.issueKey || task.id)}</span>
                  <span class="dashboard-attention-title">${escapeHtml(task.title)}</span>
                  ${task.dueDate ? `<span class="dashboard-attention-due">${escapeHtml(task.dueDate)}</span>` : ""}
                </button>
              </li>
            `;
          }).join("")}
        </ul>
      `}
    </section>

    <nav class="dashboard-continue" aria-label="${i18n.dashboard.continueLabel}">
      <span class="dashboard-section-title">${i18n.dashboard.continueLabel}</span>
      <div class="dashboard-continue-links">
        <button type="button" class="dashboard-continue-link" data-go="kanban">
          ${TablerIcon.layoutKanban({ size: 16 })}
          <span>${i18n.views.kanban}</span>
        </button>
        <button type="button" class="dashboard-continue-link" data-go="list">
          ${TablerIcon.listDetails({ size: 16 })}
          <span>${i18n.views.list}</span>
        </button>
        ${favProject ? `
          <button type="button" class="dashboard-continue-link" data-go-project="${escapeHtml(favProject.id)}">
            ${TablerIcon.starFilled({ size: 16 })}
            <span>${escapeHtml(favProject.name)}</span>
          </button>
        ` : ""}
        <button type="button" class="dashboard-continue-link" data-go="vault-health" title="${escapeHtml(i18n.dashboard.vaultHealthHint)}">
          ${TablerIcon.listCheck({ size: 16 })}
          <span>${i18n.dashboard.vaultHealthLink}</span>
        </button>
      </div>
    </nav>
  `;

  const kpiMap: Record<string, DashboardKpiAction> = {
    open: "open",
    urgent: "urgent",
    due_soon: "due_soon",
    in_progress: "in_progress",
  };
  wrapper.querySelectorAll("[data-kpi]").forEach(card => {
    const key = (card as HTMLElement).dataset.kpi || "";
    const action = kpiMap[key];
    if (action) bindKpiCard(card, action);
  });

  wrapper.querySelectorAll<HTMLButtonElement>("[data-task-id]").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.taskId;
      if (id) onOpenTask(id);
    });
  });

  wrapper.querySelector<HTMLButtonElement>('[data-go="kanban"]')?.addEventListener("click", () => {
    store.currentView = "kanban";
    store.notify();
  });
  wrapper.querySelector<HTMLButtonElement>('[data-go="list"]')?.addEventListener("click", () => {
    store.filterQuick = "all";
    store.filterStatus = "all";
    store.currentView = "list";
    store.notify();
  });
  wrapper.querySelector<HTMLButtonElement>('[data-go="vault-health"]')?.addEventListener("click", () => {
    try {
      sessionStorage.setItem("proman_backoffice_tab", "vault");
    } catch { /* ignore */ }
    store.currentView = "backoffice";
    store.notify();
  });
  wrapper.querySelector<HTMLButtonElement>("[data-go-project]")?.addEventListener("click", (e) => {
    const id = (e.currentTarget as HTMLElement).dataset.goProject;
    if (!id) return;
    const prj = store.getProject(id);
    if (!prj) return;
    store.selectedClientId = prj.clientId;
    store.selectedProjectId = prj.id;
    store.currentView = "kanban";
    store.notify();
  });

  container.appendChild(wrapper);
}
