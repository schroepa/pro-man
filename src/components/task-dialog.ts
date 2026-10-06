import { Task, TaskPriority, TaskStatus, Subtask, TaskComment, TaskAttachment, DEFAULT_COLUMNS } from "../types/task";
import { store } from "../storage/store";
import { t } from "../i18n";
import { TablerIcon } from "./icons";
import { showToast } from "./toast";
import { CustomSelect } from "./custom-select";
import {
  hasCelebratedFirstTask,
  markFirstTaskCelebrated,
  isSampleTaskId,
} from "../storage/demo-mode";

export class TaskDialog {
  private dialog: HTMLDialogElement;
  private currentTaskId: string | null = null;
  private currentSubtasks: Subtask[] = [];
  private currentComments: TaskComment[] = [];
  private currentAttachments: TaskAttachment[] = [];
  private selectClient: CustomSelect | null = null;
  private selectProject: CustomSelect | null = null;
  private selectStatus: CustomSelect | null = null;
  private selectPriority: CustomSelect | null = null;
  private selectAssignee: CustomSelect | null = null;
  private selectRecurrence: CustomSelect | null = null;

  constructor() {
    this.dialog = document.createElement("dialog");
    this.dialog.className = "task-dialog";
    this.dialog.setAttribute("aria-labelledby", "dialog-heading");
    document.body.appendChild(this.dialog);

    // Close on backdrop click
    this.dialog.addEventListener("click", (e) => {
      const rect = this.dialog.getBoundingClientRect();
      const isInDialog = (
        rect.top <= e.clientY &&
        e.clientY <= rect.top + rect.height &&
        rect.left <= e.clientX &&
        e.clientX <= rect.left + rect.width
      );
      if (!isInDialog) {
        CustomSelect.closeAll();
        this.dialog.close();
      }
    });
  }

  public open(taskOrStatus?: Task | TaskStatus): void {
    let task: Task;

    if (!taskOrStatus || typeof taskOrStatus === "string") {
      const today = new Date().toISOString().slice(0, 10);
      const clients = store.getClients();
      const defaultClient = store.selectedClientId || (clients.length > 0 ? clients[0].id : undefined);
      const projects = store.getProjects(defaultClient);
      const defaultProject = store.selectedProjectId || (projects.length > 0 ? projects[0].id : undefined);
      const newId = store.createTaskId(defaultClient, defaultProject);

      task = {
        id: newId,
        issueKey: newId,
        clientId: defaultClient,
        projectId: defaultProject,
        title: "",
        description: "",
        status: (taskOrStatus as TaskStatus) || "todo",
        priority: "normal",
        startDate: today,
        dueDate: today,
        estimateHours: 1,
        isMilestone: false,
        tags: [],
        dependencies: [],
        subtasks: [],
        comments: [],
        timeLogs: [],
        order: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      this.currentTaskId = null;
    } else {
      task = taskOrStatus;
      this.currentTaskId = task.id;
    }

    this.currentSubtasks = [...task.subtasks];
    this.currentComments = [...(task.comments || [])];
    this.currentAttachments = [...(task.attachments || [])];
    this.renderForm(task);
    this.dialog.showModal();

    const titleInput = this.dialog.querySelector<HTMLInputElement>("#task-input-title");
    titleInput?.focus();
  }

  private getStatusOptions(task: Task): { id: string; name: string }[] {
    const project = task.projectId ? store.getProject(task.projectId) : null;
    if (project?.statuses?.length) {
      return [...project.statuses].sort((a, b) => a.order - b.order);
    }
    return DEFAULT_COLUMNS.map(c => ({
      id: c.id,
      name: (t().statuses as Record<string, string>)[c.id] || c.name,
    }));
  }

  private resolveCommentAuthor(): string {
    const members = store.getMembers();
    const you = members.find(m => m.id === "mem-you") || members[0];
    return you?.name || t().tasks.commentAuthorMe;
  }

  private renderForm(task: Task): void {
    CustomSelect.closeAll();
    this.selectClient = null;
    this.selectProject = null;
    this.selectStatus = null;
    this.selectPriority = null;
    this.selectAssignee = null;
    this.selectRecurrence = null;

    const isNew = this.currentTaskId === null;
    const clients = store.getClients();
    const availableProjects = store.getProjects(task.clientId);
    const allTasks = store.getAllRawTasks().filter(tItem => tItem.id !== task.id);
    const members = store.getMembers();
    const allTags = store.getAllTags();
    const timeLogs = task.timeLogs || [];
    const timeSpent = task.timeSpentHours || timeLogs.reduce((sum, e) => sum + e.hours, 0);
    const statusOptions = this.getStatusOptions(task);

    const statusLabel = (t().statuses as Record<string, string>)[task.status] || task.status;

    this.dialog.innerHTML = `
      <form method="dialog" id="task-dialog-form">
        <div class="dialog-header">
          <div class="dialog-title-group">
            <div class="dialog-sheet-meta">
              <span class="dialog-id">${escapeHtml(task.issueKey || task.id)}</span>
              <span class="dialog-status-chip" data-status="${escapeHtml(task.status)}">${escapeHtml(statusLabel)}</span>
            </div>
            <h2 id="dialog-heading" style="font-size: var(--font-size-base); font-weight: var(--font-weight-semibold);">
              ${isNew ? t().actions.newTask : t().tasks.editTask}
            </h2>
          </div>
          <button type="button" class="btn btn-ghost btn-icon close-btn" aria-label="${t().actions.close}">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>

        <div class="dialog-body">
          <div class="form-group">
            <label class="form-label" for="task-input-title">${t().tasks.title}</label>
            <input type="text" id="task-input-title" class="input" required value="${escapeHtml(task.title)}" placeholder="${escapeHtml(t().tasks.titlePlaceholder)}" />
          </div>

          <div class="form-row-2">
            <div class="form-group">
              <span class="form-label">${t().filters.status}</span>
              <div id="task-select-status-mount"></div>
            </div>

            <div class="form-group">
              <span class="form-label">${t().filters.priority}</span>
              <div id="task-select-priority-mount"></div>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label" for="task-input-due">${t().tasks.dueDate}</label>
            <input type="date" id="task-input-due" class="input" value="${task.dueDate}" />
          </div>

          <details class="task-more-details" ${isNew ? "" : "open"}>
            <summary class="task-more-details-summary">${t().tasks.moreDetails}</summary>
            <div class="task-more-details-body">
              <p class="task-essentials-hint">${t().tasks.essentialsHint}</p>

              <div class="form-row-2">
                <div class="form-group">
                  <span class="form-label">${t().filters.client}</span>
                  <div id="task-select-client-mount"></div>
                </div>

                <div class="form-group">
                  <span class="form-label">${t().filters.project}</span>
                  <div id="task-select-project-mount"></div>
                </div>
              </div>

              <div class="form-group">
                <span class="form-label">${t().tasks.assignee}</span>
                <div id="task-select-assignee-mount"></div>
              </div>

              <div class="form-row-2">
                <div class="form-group">
                  <label class="form-label" for="task-input-start">${t().tasks.startDate}</label>
                  <input type="date" id="task-input-start" class="input" value="${task.startDate}" />
                </div>

                <div class="form-group">
                  <label class="form-label" for="task-input-estimate">${t().tasks.estimateHours}</label>
                  <input type="number" id="task-input-estimate" class="input" min="0" step="0.25" value="${task.estimateHours ?? ""}" placeholder="2" />
                </div>
              </div>

              <div class="form-group">
                <label class="form-label" for="task-input-milestone">${t().tasks.milestone}</label>
                <label class="milestone-switch-card" for="task-input-milestone">
                  <span class="milestone-switch-label">${t().tasks.markMilestone}</span>
                  <input type="checkbox" id="task-input-milestone" ${task.isMilestone ? "checked" : ""} />
                </label>
              </div>

              <div class="form-row-2">
                <div class="form-group">
                  <label class="form-label" for="task-input-cycle">${t().tasks.cycle}</label>
                  <input type="text" id="task-input-cycle" class="input" value="${escapeHtml(task.cycle || "")}" placeholder="${t().tasks.cyclePlaceholder}" />
                </div>

                <div class="form-group">
                  <span class="form-label">${t().tasks.recurrence}</span>
                  <div id="task-select-recurrence-mount"></div>
                </div>
              </div>

              <div class="form-group">
                <label class="form-label" for="task-input-giturl">${t().tasks.gitUrl}</label>
                <input type="url" id="task-input-giturl" class="input" value="${escapeHtml(task.gitUrl || "")}" placeholder="${t().tasks.gitUrlPlaceholder}" />
              </div>

              <div class="form-row-2">
                <div class="form-group">
                  <label class="form-label" for="task-input-tags">${t().tasks.tags}</label>
                  <input type="text" id="task-input-tags" class="input" list="task-tags-datalist" value="${task.tags.join(", ")}" placeholder="frontend, ui" />
                  <datalist id="task-tags-datalist">
                    ${allTags.map(tag => `<option value="${escapeHtml(tag)}"></option>`).join("")}
                  </datalist>
                </div>

                <div class="form-group">
                  <label class="form-label" for="task-input-deps">${t().tasks.dependencies}</label>
                  <input type="text" id="task-input-deps" class="input" list="task-deps-datalist" value="${task.dependencies.join(", ")}" placeholder="ACM-WEB-1, ACM-WEB-2" />
                  <datalist id="task-deps-datalist">
                    ${allTasks.map(tItem => `<option value="${escapeHtml(tItem.id)}">${escapeHtml(tItem.id)} — ${escapeHtml(tItem.title)}</option>`).join("")}
                  </datalist>
                </div>
              </div>

              <div class="form-group">
                <label class="form-label" for="task-textarea-desc">${t().tasks.description}</label>
                <textarea id="task-textarea-desc" class="textarea" rows="4">${escapeHtml(task.description)}</textarea>
              </div>

              <div class="attachments-section">
                <label class="form-label">${t().tasks.attachments}</label>
                <div id="attachments-list-container">
                  ${this.renderAttachmentsHtml()}
                </div>
                ${!store.vault.isConnected ? `<p class="attachments-meta-note">${t().tasks.attachmentsMetaOnly}</p>` : ""}
                <div class="add-attachment-row">
                  <button type="button" id="attach-file-btn" class="btn btn-secondary">${t().tasks.attachFile}</button>
                  <input type="file" id="attach-file-input" hidden multiple />
                </div>
              </div>

              <div class="subtasks-section">
                <label class="form-label">${t().tasks.subtasks}</label>
                <div id="subtasks-list-container">
                  ${this.renderSubtasksHtml()}
                </div>
                <div class="add-subtask-row">
                  <input type="text" id="new-subtask-input" class="input" placeholder="${t().tasks.addSubtask}" />
                  <button type="button" id="add-subtask-btn" class="btn btn-secondary">${t().actions.add}</button>
                </div>
              </div>

              <div class="comments-section">
                <label class="form-label">${t().tasks.comments}</label>
                <div id="comments-list-container">
                  ${this.renderCommentsHtml()}
                </div>
                <div class="add-comment-row">
                  <input type="text" id="new-comment-input" class="input" placeholder="${t().tasks.addComment}" />
                  <button type="button" id="add-comment-btn" class="btn btn-secondary">${t().actions.add}</button>
                </div>
              </div>

              ${!isNew ? `
                <div class="time-logs-section">
                  <label class="form-label">
                    ${t().tasks.timeLogs}
                    <span style="font-weight: var(--font-weight-normal); color: var(--color-text-muted);">
                      ${timeSpent}h / ${task.estimateHours ?? "—"}h
                    </span>
                  </label>
                  <div id="time-logs-list" class="time-logs-list">
                    ${this.renderTimeLogsHtml(timeLogs)}
                  </div>
                  <div class="time-log-form">
                    <input type="number" id="time-log-hours" class="input" min="0.25" step="0.25" placeholder="${t().tasks.timeHours}" style="max-width: 100px;" />
                    <input type="text" id="time-log-desc" class="input" placeholder="${t().tasks.timeDescription}" />
                    <button type="button" id="time-log-btn" class="btn btn-secondary">${t().actions.logTime}</button>
                  </div>
                </div>
              ` : ""}
            </div>
          </details>
        </div>

        <div class="dialog-footer">
          <div class="dialog-footer-left">
            ${!isNew ? `
              <button type="button" id="duplicate-task-btn" class="btn btn-ghost">
                ${TablerIcon.copy({ size: 14 })}
                <span>${t().actions.duplicate}</span>
              </button>
              <button type="button" id="delete-task-btn" class="btn btn-ghost" style="color: #ef4444;">
                ${t().actions.delete}
              </button>
            ` : ""}
          </div>
          <div class="dialog-footer-actions">
            <button type="button" class="btn btn-secondary cancel-btn">${t().actions.cancel}</button>
            <button type="submit" class="btn btn-primary">${t().actions.save}</button>
          </div>
        </div>
      </form>
    `;

    this.mountSelects(task, clients, availableProjects, members, statusOptions);

    this.dialog.querySelector(".close-btn")?.addEventListener("click", () => this.dialog.close());
    this.dialog.querySelector(".cancel-btn")?.addEventListener("click", () => this.dialog.close());

    const newSubtaskInput = this.dialog.querySelector<HTMLInputElement>("#new-subtask-input");
    const addSubtask = () => {
      const val = newSubtaskInput?.value.trim();
      if (val) {
        this.currentSubtasks.push({
          id: `sub-${Date.now()}`,
          title: val,
          completed: false,
        });
        if (newSubtaskInput) newSubtaskInput.value = "";
        this.updateSubtasksListUI();
      }
    };

    this.dialog.querySelector("#add-subtask-btn")?.addEventListener("click", addSubtask);
    newSubtaskInput?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        addSubtask();
      }
    });

    this.dialog.querySelector("#subtasks-list-container")?.addEventListener("change", (e) => {
      const target = e.target as HTMLInputElement;
      if (target.classList.contains("subtask-checkbox")) {
        const sub = this.currentSubtasks.find(s => s.id === target.dataset.id);
        if (sub) {
          sub.completed = target.checked;
          this.updateSubtasksListUI();
        }
      }
    });

    this.dialog.querySelector("#subtasks-list-container")?.addEventListener("click", (e) => {
      const target = e.target as HTMLElement;
      const btn = target.closest<HTMLButtonElement>(".delete-subtask-btn");
      if (btn?.dataset.id) {
        this.currentSubtasks = this.currentSubtasks.filter(s => s.id !== btn.dataset.id);
        this.updateSubtasksListUI();
      }
    });

    const fileInput = this.dialog.querySelector<HTMLInputElement>("#attach-file-input");
    const attachFiles = async (files: FileList | File[]) => {
      const list = Array.from(files);
      for (const file of list) {
        let relativePath = "";
        if (store.vault.isConnected) {
          const path = await store.vault.copyAttachmentFile(file);
          if (path) {
            relativePath = path;
          } else {
            showToast(t().tasks.attachmentsMetaOnly, "warning");
          }
        }
        this.currentAttachments.push({
          id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          name: file.name,
          relativePath,
        });
      }
      this.updateAttachmentsListUI();
    };

    this.dialog.querySelector("#attach-file-btn")?.addEventListener("click", async () => {
      const picker = (window as any).showOpenFilePicker as undefined | ((opts?: any) => Promise<any[]>);
      if (typeof picker === "function") {
        try {
          const handles = await picker({ multiple: true });
          const files: File[] = [];
          for (const handle of handles) {
            files.push(await handle.getFile());
          }
          await attachFiles(files);
          return;
        } catch (err: any) {
          if (err?.name === "AbortError") return;
        }
      }
      fileInput?.click();
    });

    fileInput?.addEventListener("change", async () => {
      if (fileInput.files?.length) {
        await attachFiles(fileInput.files);
        fileInput.value = "";
      }
    });

    this.dialog.querySelector("#attachments-list-container")?.addEventListener("click", (e) => {
      const target = e.target as HTMLElement;
      const btn = target.closest<HTMLButtonElement>(".delete-attachment-btn");
      if (btn?.dataset.id) {
        this.currentAttachments = this.currentAttachments.filter(a => a.id !== btn.dataset.id);
        this.updateAttachmentsListUI();
      }
    });

    const newCommentInput = this.dialog.querySelector<HTMLInputElement>("#new-comment-input");
    const addComment = () => {
      const val = newCommentInput?.value.trim();
      if (val) {
        this.currentComments.push({
          id: `cmt-${Date.now()}`,
          author: this.resolveCommentAuthor(),
          body: val,
          createdAt: new Date().toISOString(),
        });
        if (newCommentInput) newCommentInput.value = "";
        this.updateCommentsListUI();
      }
    };
    this.dialog.querySelector("#add-comment-btn")?.addEventListener("click", addComment);
    newCommentInput?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        addComment();
      }
    });

    this.dialog.querySelector("#time-log-btn")?.addEventListener("click", async () => {
      if (!this.currentTaskId) return;
      const hoursInput = this.dialog.querySelector<HTMLInputElement>("#time-log-hours");
      const descInput = this.dialog.querySelector<HTMLInputElement>("#time-log-desc");
      const hours = Number(hoursInput?.value);
      if (!Number.isFinite(hours) || hours <= 0) {
        showToast(t().tasks.timeHours, "warning");
        return;
      }
      const description = descInput?.value.trim() || undefined;
      await store.logTaskTime(this.currentTaskId, hours, description);
      const refreshed = store.getTask(this.currentTaskId);
      if (refreshed) {
        this.currentComments = [...(refreshed.comments || [])];
        this.currentSubtasks = [...refreshed.subtasks];
        this.renderForm(refreshed);
      }
      showToast(`${t().announcements.timeLogged}: ${hours}h`, "success");
    });

    this.dialog.querySelector("#duplicate-task-btn")?.addEventListener("click", async () => {
      const draft = this.collectFormTask(task);
      const newId = store.createTaskId(draft.clientId, draft.projectId);
      const now = new Date().toISOString();
      const duplicated: Task = {
        ...draft,
        id: newId,
        issueKey: newId,
        status: "todo",
        timeLogs: [],
        timeSpentHours: undefined,
        comments: [],
        subtasks: draft.subtasks.map(s => ({ ...s, id: `sub-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, completed: false })),
        createdAt: now,
        updatedAt: now,
      };
      await store.saveOrUpdateTask(duplicated);
      showToast(`${t().tasks.duplicated}: ${newId}`, "success");
      this.currentTaskId = duplicated.id;
      this.currentSubtasks = [...duplicated.subtasks];
      this.currentComments = [];
      this.currentAttachments = [...(duplicated.attachments || [])];
      this.renderForm(duplicated);
    });

    this.dialog.querySelector("#delete-task-btn")?.addEventListener("click", async () => {
      if (confirm(t().tasks.deleteConfirm)) {
        await store.deleteTask(task.id);
        this.dialog.close();
      }
    });

    this.dialog.querySelector("#task-dialog-form")?.addEventListener("submit", async (e) => {
      e.preventDefault();

      let updatedTask = this.collectFormTask(task);
      // Final safety: new tasks always get an issue key from the chosen client/project
      if (this.currentTaskId === null) {
        updatedTask = this.assignIssueKeyForNewTask(updatedTask);
      }

      if (store.wouldCreateDependencyCycle(updatedTask.id, updatedTask.dependencies)) {
        showToast(t().tasks.dependencyCycle, "warning");
        return;
      }

      const wasNew = this.currentTaskId === null;
      await store.saveOrUpdateTask(updatedTask);
      if (
        wasNew &&
        !isSampleTaskId(updatedTask.id) &&
        !hasCelebratedFirstTask()
      ) {
        markFirstTaskCelebrated();
        showToast(t().tasks.firstTaskToast, "success");
      }
      this.dialog.close();
    });
  }

  /** Allocate CLIENT-PROJECT-N for drafts that are not yet persisted. */
  private assignIssueKeyForNewTask(task: Task): Task {
    const newId = store.createTaskId(task.clientId, task.projectId);
    return { ...task, id: newId, issueKey: newId };
  }

  private mountSelects(
    task: Task,
    clients: ReturnType<typeof store.getClients>,
    availableProjects: ReturnType<typeof store.getProjects>,
    members: ReturnType<typeof store.getMembers>,
    statusOptions: { id: string; name: string }[],
  ): void {
    const clientMount = this.dialog.querySelector("#task-select-client-mount");
    const projectMount = this.dialog.querySelector("#task-select-project-mount");
    const statusMount = this.dialog.querySelector("#task-select-status-mount");
    const priorityMount = this.dialog.querySelector("#task-select-priority-mount");
    const assigneeMount = this.dialog.querySelector("#task-select-assignee-mount");
    const recurrenceMount = this.dialog.querySelector("#task-select-recurrence-mount");

    this.selectClient = new CustomSelect({
      options: [
        { value: "", label: "—" },
        ...clients.map(c => ({ value: c.id, label: c.name, color: c.color })),
      ],
      selectedValue: task.clientId || "",
      ariaLabel: t().filters.client,
      onChange: (val) => {
        const projects = store.getProjects(val || undefined);
        const nextProjectId = projects[0]?.id || "";
        this.selectProject?.setOptions([
          { value: "", label: "—" },
          ...projects.map(p => ({ value: p.id, label: p.name, color: p.color })),
        ]);
        this.selectProject?.setValue(nextProjectId);

        // New tasks: issue key must follow the selected client/project (not the open-time default)
        if (this.currentTaskId === null) {
          const draft = this.collectFormTask({
            ...task,
            clientId: val || undefined,
            projectId: nextProjectId || undefined,
          });
          this.renderForm(this.assignIssueKeyForNewTask(draft));
        }
      },
    });

    this.selectProject = new CustomSelect({
      options: [
        { value: "", label: "—" },
        ...availableProjects.map(p => ({ value: p.id, label: p.name, color: p.color })),
      ],
      selectedValue: task.projectId || "",
      ariaLabel: t().filters.project,
      onChange: () => {
        const draft = this.collectFormTask(task);
        if (this.currentTaskId === null) {
          this.renderForm(this.assignIssueKeyForNewTask(draft));
        } else {
          // Existing task: keep id, refresh status options for the project
          this.renderForm(draft);
        }
      },
    });

    this.selectStatus = new CustomSelect({
      options: statusOptions.map(s => ({ value: s.id, label: s.name })),
      selectedValue: task.status,
      ariaLabel: t().filters.status,
      onChange: () => {},
    });

    this.selectPriority = new CustomSelect({
      options: [
        { value: "urgent", label: t().priorities.urgent, color: "#dc2626", iconSvg: TablerIcon.alertTriangle({ size: 13, strokeWidth: 2.2 }) },
        { value: "high", label: t().priorities.high, color: "#c25e1a", iconSvg: TablerIcon.arrowUp({ size: 13, strokeWidth: 2.2 }) },
        { value: "normal", label: t().priorities.normal, color: "#6e6757", iconSvg: TablerIcon.minus({ size: 13, strokeWidth: 2.2 }) },
        { value: "low", label: t().priorities.low, color: "#948d7d", iconSvg: TablerIcon.arrowDown({ size: 13, strokeWidth: 2.2 }) },
      ],
      selectedValue: task.priority,
      ariaLabel: t().filters.priority,
      onChange: () => {},
    });

    this.selectAssignee = new CustomSelect({
      options: [
        { value: "", label: t().tasks.noAssignee },
        ...members.map(m => ({ value: m.id, label: m.name })),
      ],
      selectedValue: task.assigneeId || "",
      ariaLabel: t().tasks.assignee,
      onChange: () => {},
    });

    this.selectRecurrence = new CustomSelect({
      options: [
        { value: "", label: t().tasks.recurrenceNone },
        { value: "weekly", label: t().tasks.recurrenceWeekly },
        { value: "monthly", label: t().tasks.recurrenceMonthly },
      ],
      selectedValue: task.recurrence || "",
      ariaLabel: t().tasks.recurrence,
      onChange: () => {},
    });

    clientMount?.appendChild(this.selectClient.getElement());
    projectMount?.appendChild(this.selectProject.getElement());
    statusMount?.appendChild(this.selectStatus.getElement());
    priorityMount?.appendChild(this.selectPriority.getElement());
    assigneeMount?.appendChild(this.selectAssignee.getElement());
    recurrenceMount?.appendChild(this.selectRecurrence.getElement());
  }

  private collectFormTask(base: Task): Task {
    const title = (this.dialog.querySelector("#task-input-title") as HTMLInputElement).value.trim();
    const clientId = this.selectClient?.getValue() || undefined;
    const projectId = this.selectProject?.getValue() || undefined;
    const status = (this.selectStatus?.getValue() || base.status) as TaskStatus;
    const priority = (this.selectPriority?.getValue() || base.priority) as TaskPriority;
    const assigneeId = this.selectAssignee?.getValue() || undefined;
    const startDate = (this.dialog.querySelector("#task-input-start") as HTMLInputElement).value;
    const dueDate = (this.dialog.querySelector("#task-input-due") as HTMLInputElement).value;
    const estimateRaw = (this.dialog.querySelector("#task-input-estimate") as HTMLInputElement).value;
    const estimateHours = estimateRaw === "" ? undefined : Number(estimateRaw);
    const isMilestone = (this.dialog.querySelector("#task-input-milestone") as HTMLInputElement).checked;
    const cycle = (this.dialog.querySelector("#task-input-cycle") as HTMLInputElement).value.trim() || undefined;
    const gitUrl = (this.dialog.querySelector("#task-input-giturl") as HTMLInputElement).value.trim() || undefined;
    const recurrenceRaw = this.selectRecurrence?.getValue() || "";
    const recurrence = recurrenceRaw === "weekly" || recurrenceRaw === "monthly" ? recurrenceRaw : null;
    const tagsStr = (this.dialog.querySelector("#task-input-tags") as HTMLInputElement).value;
    const depsStr = (this.dialog.querySelector("#task-input-deps") as HTMLInputElement).value;
    const description = (this.dialog.querySelector("#task-textarea-desc") as HTMLTextAreaElement).value;

    const tags = tagsStr.split(",").map(s => s.trim()).filter(Boolean);
    const dependencies = depsStr.split(",").map(s => s.trim()).filter(Boolean);

    const latest = this.currentTaskId ? store.getTask(this.currentTaskId) : null;

    return {
      ...base,
      ...(latest || {}),
      clientId,
      projectId,
      assigneeId,
      title,
      status,
      priority,
      startDate,
      dueDate,
      estimateHours: Number.isFinite(estimateHours) ? estimateHours : undefined,
      isMilestone,
      cycle,
      gitUrl,
      recurrence,
      tags,
      dependencies,
      description,
      subtasks: this.currentSubtasks.map(s => ({ ...s })),
      comments: this.currentComments.map(c => ({ ...c })),
      attachments: this.currentAttachments.map(a => ({ ...a })),
      updatedAt: new Date().toISOString(),
    };
  }

  private renderTimeLogsHtml(logs: NonNullable<Task["timeLogs"]>): string {
    if (!logs.length) {
      return `<p class="time-logs-empty">${t().tasks.timeLogs}: —</p>`;
    }
    return logs.map(entry => `
      <div class="time-log-item">
        <span class="time-log-hours">${entry.hours}h</span>
        <span class="time-log-date">${escapeHtml(entry.date)}</span>
        <span class="time-log-desc">${escapeHtml(entry.description || "")}</span>
      </div>
    `).join("");
  }

  private renderAttachmentsHtml(): string {
    if (this.currentAttachments.length === 0) {
      return `<p style="font-size: var(--font-size-xs); color: var(--color-text-muted); font-style: italic;">${t().tasks.noAttachments}</p>`;
    }
    return this.currentAttachments.map(a => `
      <div class="attachment-item">
        <span class="attachment-name" title="${escapeHtml(a.relativePath || a.name)}">${escapeHtml(a.name)}</span>
        ${a.relativePath
          ? `<span class="attachment-path">${escapeHtml(a.relativePath)}</span>`
          : `<span class="attachment-path muted">${t().tasks.attachmentsMetaOnly}</span>`}
        <button type="button" class="delete-attachment-btn" data-id="${a.id}" aria-label="${t().actions.delete}" title="${t().actions.delete}">
          ${TablerIcon.x({ size: 12 })}
        </button>
      </div>
    `).join("");
  }

  private updateAttachmentsListUI(): void {
    const container = this.dialog.querySelector("#attachments-list-container");
    if (container) {
      container.innerHTML = this.renderAttachmentsHtml();
    }
  }

  private renderSubtasksHtml(): string {
    if (this.currentSubtasks.length === 0) {
      return `<p style="font-size: var(--font-size-xs); color: var(--color-text-muted); font-style: italic;">${t().tasks.noSubtasks}</p>`;
    }

    return this.currentSubtasks.map(s => `
      <div class="subtask-item">
        <input type="checkbox" class="subtask-checkbox" data-id="${s.id}" ${s.completed ? "checked" : ""} aria-label="${escapeHtml(s.title)}" />
        <span class="subtask-text ${s.completed ? "completed" : ""}">${escapeHtml(s.title)}</span>
        <button type="button" class="delete-subtask-btn" data-id="${s.id}" aria-label="${t().actions.delete}" title="${t().actions.delete}">
          ${TablerIcon.x({ size: 12 })}
        </button>
      </div>
    `).join("");
  }

  private renderCommentsHtml(): string {
    if (this.currentComments.length === 0) {
      return `<p style="font-size: var(--font-size-xs); color: var(--color-text-muted); font-style: italic;">${t().tasks.noComments}</p>`;
    }
    return this.currentComments.map(c => `
      <div class="comment-item">
        <div class="comment-meta">
          <strong class="comment-author">${escapeHtml(c.author)}</strong>
          <time class="comment-date" datetime="${escapeHtml(c.createdAt)}">${formatCommentDate(c.createdAt)}</time>
        </div>
        <p class="comment-body">${escapeHtml(c.body)}</p>
      </div>
    `).join("");
  }

  private updateSubtasksListUI(): void {
    const container = this.dialog.querySelector("#subtasks-list-container");
    if (container) {
      container.innerHTML = this.renderSubtasksHtml();
    }
  }

  private updateCommentsListUI(): void {
    const container = this.dialog.querySelector("#comments-list-container");
    if (container) {
      container.innerHTML = this.renderCommentsHtml();
    }
  }
}

function escapeHtml(text: string): string {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function formatCommentDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}
