import { Task, TaskPriority, TaskStatus, TimeEntry, DEFAULT_COLUMNS, ColumnDefinition } from "../types/task";
import { Client, Project, ContactPerson } from "../types/client";
import { DocItem } from "../types/doc";
import { WorkspaceMember } from "../types/member";
import { VaultStorage, getLastVaultNames } from "./file-system";
import { announcer } from "../a11y/announcer";
import { t } from "../i18n";
import { showToast } from "../components/toast";

export type ViewMode = "kanban" | "list" | "gantt" | "calendar" | "docs" | "backoffice";

const FAVORITES_KEY = "pro_man_favorite_projects";
const MEMBERS_KEY = "pro_man_members";

function cloneTask(task: Task): Task {
  return {
    ...task,
    tags: [...task.tags],
    dependencies: [...task.dependencies],
    subtasks: task.subtasks.map(s => ({ ...s })),
    timeLogs: task.timeLogs ? task.timeLogs.map(e => ({ ...e })) : undefined,
    comments: task.comments ? task.comments.map(c => ({ ...c })) : undefined,
    attachments: task.attachments ? task.attachments.map(a => ({ ...a })) : undefined,
  };
}

function shiftDate(iso: string, recurrence: "weekly" | "monthly"): string {
  const d = new Date(iso + "T12:00:00");
  if (Number.isNaN(d.getTime())) return iso;
  if (recurrence === "weekly") {
    d.setDate(d.getDate() + 7);
  } else {
    d.setMonth(d.getMonth() + 1);
  }
  return d.toISOString().slice(0, 10);
}

export { getLastVaultNames };

function reportVaultError(storage: VaultStorage): void {
  const err = storage.getLastError();
  if (err) {
    showToast(`${t().announcements.vaultWriteError}: ${err}`, "error");
    storage.clearError();
  }
}
export type QuickFilter = "all" | "overdue" | "due_soon" | "has_blocker" | "no_date";

interface Command {
  execute(): Promise<void>;
  undo(): Promise<void>;
  description: string;
}

export class AppStore {
  private tasks: Map<string, Task> = new Map();
  private clients: Map<string, Client> = new Map();
  private projects: Map<string, Project> = new Map();
  private docs: Map<string, DocItem> = new Map();
  private members: Map<string, WorkspaceMember> = new Map();

  private storage: VaultStorage;
  private listeners: Set<() => void> = new Set();
  
  // Undo/Redo Stacks
  private undoStack: Command[] = [];
  private redoStack: Command[] = [];

  // Navigation & Multi-filter state
  public currentView: ViewMode = "kanban";
  public searchQuery: string = "";
  public selectedClientId: string | null = null;
  public selectedProjectId: string | null = null;
  public filterPriority: TaskPriority | "all" = "all";
  public filterStatus: TaskStatus | "all" = "all";
  public filterQuick: QuickFilter = "all";
  public filterAssignee: string | "all" = "all";
  public filterCycle: string = "";
  public favoriteProjectIds: string[] = [];
  
  public selectedTaskId: string | null = null;
  public selectedDocId: string | null = null;

  constructor() {
    this.storage = new VaultStorage();
    this.loadFavorites();
  }

  get vault(): VaultStorage {
    return this.storage;
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  public notify(): void {
    this.listeners.forEach(fn => fn());
  }

  async init(): Promise<void> {
    const restored = await this.storage.tryRestore();
    if (restored) {
      await this.reloadAll();
      return;
    }

    const clientsData = await this.storage.loadClientsAndProjects();
    if (clientsData?.clients?.length) {
      this.clients.clear();
      clientsData.clients.forEach(c => this.clients.set(c.id, c));
      this.projects.clear();
      (clientsData.projects || []).forEach(p => this.projects.set(p.id, p));
      this.loadMembersFromData(clientsData.members);
    } else {
      this.initDefaultClientsAndProjects();
      this.ensureDefaultMembers();
    }

    const loaded = await this.storage.loadAllTasks();
    if (loaded.length === 0) {
      this.createSampleTasks();
    } else {
      loaded.forEach(t => this.tasks.set(t.id, t));
      this.normalizeStatusesToColumns(this.getActiveColumns());
    }

    const docs = await this.storage.loadAllDocs();
    if (docs.length === 0) {
      this.initDefaultDocs();
      for (const doc of this.docs.values()) {
        await this.storage.saveDoc(doc);
      }
    } else {
      this.docs.clear();
      docs.forEach(d => this.docs.set(d.id, d));
    }

    this.notify();
  }

  private loadFavorites(): void {
    try {
      const raw = localStorage.getItem(FAVORITES_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          this.favoriteProjectIds = parsed.filter((id): id is string => typeof id === "string");
        }
      }
    } catch {
      this.favoriteProjectIds = [];
    }
  }

  private persistFavorites(): void {
    try {
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(this.favoriteProjectIds));
    } catch {}
  }

  toggleFavoriteProject(projectId: string): void {
    if (this.favoriteProjectIds.includes(projectId)) {
      this.favoriteProjectIds = this.favoriteProjectIds.filter(id => id !== projectId);
    } else {
      this.favoriteProjectIds = [...this.favoriteProjectIds, projectId];
    }
    this.persistFavorites();
    this.notify();
  }

  isFavoriteProject(projectId: string): boolean {
    return this.favoriteProjectIds.includes(projectId);
  }

  private loadMembersFromData(members?: WorkspaceMember[]): void {
    this.members.clear();
    if (members?.length) {
      members.forEach(m => this.members.set(m.id, m));
      return;
    }
    try {
      const raw = localStorage.getItem(MEMBERS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as WorkspaceMember[];
        if (Array.isArray(parsed) && parsed.length) {
          parsed.forEach(m => this.members.set(m.id, m));
          return;
        }
      }
    } catch {}
    this.ensureDefaultMembers();
  }

  private ensureDefaultMembers(): void {
    if (this.members.size > 0) return;
    const defaults: WorkspaceMember[] = [
      { id: "mem-you", name: "You" },
      { id: "mem-optional", name: "Optional" },
    ];
    defaults.forEach(m => this.members.set(m.id, m));
  }

  getMembers(): WorkspaceMember[] {
    return Array.from(this.members.values());
  }

  getMember(id: string): WorkspaceMember | undefined {
    return this.members.get(id);
  }

  async addMember(member: WorkspaceMember): Promise<void> {
    this.members.set(member.id, member);
    await this.persistClients();
    this.notify();
  }

  getAllTags(): string[] {
    const tags = new Set<string>();
    for (const task of this.tasks.values()) {
      task.tags.forEach(tag => tags.add(tag));
    }
    for (const doc of this.docs.values()) {
      doc.tags.forEach(tag => tags.add(tag));
    }
    return Array.from(tags).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
  }

  private initDefaultClientsAndProjects(): void {
    const defaultClients: Client[] = [
      {
        id: "cli-acme",
        name: "Acme Corporation",
        color: "#3b82f6",
        code: "ACM",
        description: "Global Enterprise B2B Kunden für Logistik & Portal-Infrastruktur",
        website: "https://acme-global.example.com",
        email: "contact@acme-global.example.com",
        phone: "+49 89 1234567-0",
        address: "Maximilianstraße 35, 80539 München",
        industry: "Enterprise Software & Logistik",
        taxId: "DE123456789",
        notes: "Wichtiger Key Account. SLA: 4h Reaktionszeit. Monatliches Abstimmungsmeeting jeweils am ersten Donnerstag.",
        contacts: [
          {
            id: "con-1",
            name: "Dr. Alexander Weber",
            role: "Chief Technology Officer (CTO)",
            email: "a.weber@acme-global.example.com",
            phone: "+49 89 1234567-12",
            isPrimary: true,
          },
          {
            id: "con-2",
            name: "Sabine Meyer",
            role: "Lead Product Owner",
            email: "s.meyer@acme-global.example.com",
            phone: "+49 89 1234567-45",
            isPrimary: false,
          }
        ]
      },
      {
        id: "cli-techstart",
        name: "TechStart Labs",
        color: "#10b981",
        code: "TSL",
        description: "SaaS AI Startup für Predictive Analytics",
        website: "https://techstart-labs.example.io",
        email: "founders@techstart-labs.example.io",
        phone: "+49 30 9876543-0",
        address: "Torstraße 110, 10119 Berlin",
        industry: "Künstliche Intelligenz / SaaS",
        taxId: "DE987654321",
        notes: "Agiles Startup mit wöchentlichen Sprint-Reviews. Schnelle Entscheidungswege via Slack & ProMan.",
        contacts: [
          {
            id: "con-3",
            name: "Elena Rostova",
            role: "Head of Engineering",
            email: "elena@techstart-labs.example.io",
            phone: "+49 171 5550192",
            isPrimary: true,
          }
        ]
      },
      {
        id: "cli-internal",
        name: "Intern / ProMan Core",
        color: "#8b5cf6",
        code: "INT",
        description: "Interne Produktentwicklung & Open-Source-Kern",
        website: "https://proman.local",
        email: "core@proman.local",
        phone: "+49 711 500000",
        address: "Innovationscampus 1, 70173 Stuttgart",
        industry: "Produkt-Entwicklung",
        notes: "Interne Aufgaben, Feature-Roadmap, Meilensteine und Release-Zyklen.",
        contacts: []
      },
    ];
    defaultClients.forEach(c => this.clients.set(c.id, c));

    const defaultProjects: Project[] = [
      { id: "prj-web-redesign", clientId: "cli-acme", name: "Web-Portal Relaunch", description: "Komplettüberarbeitung Frontend & Auth", color: "#3b82f6", code: "WEB" },
      { id: "prj-mobile-app", clientId: "cli-techstart", name: "Mobile App v2", description: "iOS / Android Feature Update", color: "#10b981", code: "MOB" },
      { id: "prj-core-dev", clientId: "cli-internal", name: "ProMan v1.0 Release", description: "Local-First ClickUp Alternative", color: "#8b5cf6", code: "CORE" },
    ];
    defaultProjects.forEach(p => this.projects.set(p.id, p));
  }

  private initDefaultDocs(): void {
    const defaultDocs: DocItem[] = [
      {
        id: "DOC-001",
        clientId: "cli-acme",
        projectId: "prj-web-redesign",
        title: "Anforderungsspezifikation Portal",
        content: `# Anforderungsspezifikation Portal\n\n## Zielsetzung\nRelaunch des Kundenportals mit optimierten Ladezeiten und intuitiver Navigation.\n\n### Meilensteine\n- [x] Wireframes genehmigt\n- [ ] Design Tokens finalisieren\n- [ ] API-Schnittstellen anbinden\n\n## Notizen\nKeine Rahmenlinien im Design verwenden, nur tonale Trennungen.`,
        tags: ["konzept", "portal", "spezifikation"],
        createdAt: "2026-10-01T10:00:00.000Z",
        updatedAt: "2026-10-05T12:00:00.000Z",
      },
      {
        id: "DOC-002",
        clientId: "cli-internal",
        projectId: "prj-core-dev",
        title: "Architektur & Anti-AI-Slop Richtlinie",
        content: `# Architektur & Anti-AI-Slop Richtlinie\n\n## Design-Prinzipien\n1. **Zero-Borders**: Trennungen erfolgen ausschließlich über tonale Hintergrundkontraste und diffuse Tiefenschatten.\n2. **Obsidian-Style Storage**: Aufgaben liegen als editierbare .md-Dateien auf dem Dateisystem.\n3. **Volle Tastatur- & Screenreader-Zugänglichkeit** (WCAG 2.1/2.2 AA).`,
        tags: ["architecture", "design-system"],
        createdAt: "2026-10-02T14:00:00.000Z",
        updatedAt: "2026-10-05T16:00:00.000Z",
      }
    ];
    defaultDocs.forEach(d => this.docs.set(d.id, d));
  }

  private createSampleTasks(): void {
    const samples: Task[] = [
      {
        id: "TASK-001",
        issueKey: "INT-CORE-1",
        clientId: "cli-internal",
        projectId: "prj-core-dev",
        title: "Architektur & Design Tokens definieren",
        description: "WCAG 2.1/2.2 AA konforme Farben, Typografie und Spacing Tokens im Vanilla CSS anlegen.",
        status: "done",
        priority: "urgent",
        startDate: "2026-10-01",
        dueDate: "2026-10-03",
        estimateHours: 6,
        tags: ["design-system", "a11y"],
        dependencies: [],
        subtasks: [
          { id: "s1", title: "Kontrastwerte prüfen (> 4.5:1)", completed: true },
          { id: "s2", title: "Focus-Ringe styling", completed: true },
        ],
        order: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "TASK-002",
        issueKey: "INT-CORE-2",
        clientId: "cli-internal",
        projectId: "prj-core-dev",
        title: "Accessible Kanban Board mit Drag & Drop",
        description: "Board Spalten rendern, Tastatur-Navigation mit Roving Tabindex und Screenreader-Feedback via Live-Region.",
        status: "in-progress",
        priority: "high",
        startDate: "2026-10-04",
        dueDate: "2026-10-08",
        estimateHours: 12,
        tags: ["kanban", "core"],
        dependencies: ["TASK-001"],
        subtasks: [
          { id: "s1", title: "Pfeiltasten-Steuerung", completed: true },
          { id: "s2", title: "Pointer Drag & Drop", completed: false },
        ],
        order: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "TASK-003",
        issueKey: "ACM-WEB-1",
        clientId: "cli-acme",
        projectId: "prj-web-redesign",
        title: "Web-Portal Header & Responsive Layout",
        description: "Sleek borderless Header mit Dropdown und Navigationsbaum.",
        status: "todo",
        priority: "high",
        startDate: "2026-10-07",
        dueDate: "2026-10-14",
        estimateHours: 16,
        tags: ["gantt", "timeline", "portal"],
        dependencies: ["TASK-002"],
        subtasks: [
          { id: "s1", title: "Layout erstellen", completed: false },
          { id: "s2", title: "Mobile Ansicht optimieren", completed: false },
        ],
        order: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "TASK-004",
        issueKey: "TSL-MOB-1",
        clientId: "cli-techstart",
        projectId: "prj-mobile-app",
        title: "Mobile Push Notifications Setup",
        description: "Notification Service Worker und Push API konfigurieren.",
        status: "in-review",
        priority: "normal",
        startDate: "2026-10-05",
        dueDate: "2026-10-09",
        estimateHours: 8,
        tags: ["notifications", "mobile"],
        dependencies: [],
        subtasks: [
          { id: "s1", title: "Push Token Registry", completed: true },
        ],
        order: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    samples.forEach(t => {
      this.tasks.set(t.id, t);
      this.storage.saveTask(t);
    });
  }

  async reloadTasks(): Promise<void> {
    await this.reloadAll();
  }

  async reloadAll(): Promise<void> {
    const clientsData = await this.storage.loadClientsAndProjects();
    if (clientsData?.clients?.length) {
      this.clients.clear();
      clientsData.clients.forEach(c => this.clients.set(c.id, c));
      this.projects.clear();
      (clientsData.projects || []).forEach(p => this.projects.set(p.id, p));
      this.loadMembersFromData(clientsData.members);
    } else if (this.clients.size === 0) {
      this.initDefaultClientsAndProjects();
      this.ensureDefaultMembers();
    } else {
      this.loadMembersFromData(clientsData?.members);
    }

    const list = await this.storage.loadAllTasks();
    this.tasks.clear();
    if (list.length === 0 && !this.storage.isConnected) {
      this.createSampleTasks();
    } else {
      list.forEach(t => this.tasks.set(t.id, t));
      this.normalizeStatusesToColumns(this.getActiveColumns());
    }

    const docs = await this.storage.loadAllDocs();
    this.docs.clear();
    if (docs.length === 0 && !this.storage.isConnected) {
      this.initDefaultDocs();
      for (const doc of this.docs.values()) {
        await this.storage.saveDoc(doc);
      }
    } else {
      docs.forEach(d => this.docs.set(d.id, d));
    }

    this.notify();
  }

  // --- Clients & Projects Queries ---
  getClients(): Client[] {
    return Array.from(this.clients.values());
  }

  getClient(id: string): Client | undefined {
    return this.clients.get(id);
  }

  getProjects(clientId?: string): Project[] {
    const list = Array.from(this.projects.values());
    if (clientId) {
      return list.filter(p => p.clientId === clientId);
    }
    return list;
  }

  getProject(id: string): Project | undefined {
    return this.projects.get(id);
  }

  /** Kanban columns for the currently selected project, or the built-in defaults. */
  getActiveColumns(): ColumnDefinition[] {
    if (this.selectedProjectId) {
      const project = this.projects.get(this.selectedProjectId);
      if (project?.statuses && project.statuses.length > 0) {
        return [...project.statuses].sort((a, b) => a.order - b.order);
      }
    }
    return DEFAULT_COLUMNS.map(c => ({ ...c }));
  }

  /** Map tasks whose status is not in the given columns onto the first column. */
  normalizeStatusesToColumns(columns: ColumnDefinition[]): void {
    if (!columns.length) return;
    const valid = new Set(columns.map(c => c.id));
    const fallback = columns[0].id;
    for (const task of this.tasks.values()) {
      if (!valid.has(task.status)) {
        task.status = fallback;
      }
    }
  }

  /** Tasks that depend on `doneTaskId` and become unblocked once it is done. */
  private findNewlyUnblocked(doneTaskId: string): Task[] {
    const result: Task[] = [];
    for (const task of this.tasks.values()) {
      if (task.id === doneTaskId || task.status === "done") continue;
      if (!task.dependencies?.includes(doneTaskId)) continue;
      // Was blocked by this dep (and possibly others); check if all deps are now done
      const stillBlocked = task.dependencies.some(depId => {
        if (depId === doneTaskId) return false;
        const dep = this.tasks.get(depId);
        return dep && dep.status !== "done";
      });
      if (!stillBlocked) {
        result.push(task);
      }
    }
    return result;
  }

  private toastUnblocked(doneTaskId: string): void {
    const unblocked = this.findNewlyUnblocked(doneTaskId);
    if (unblocked.length === 0) return;
    const names = unblocked.map(t => t.title || t.id).slice(0, 3);
    const more = unblocked.length > 3 ? ` (+${unblocked.length - 3})` : "";
    showToast(`${t().announcements.unblocked}: ${names.join(", ")}${more}`, "success");
  }

  /**
   * Next sequential issue key: CLIENT-PROJECT-N (unbounded N).
   * Examples: ACM-WEB-1, ACM-WEB-1000, INT-42, TASK-7
   * Numbers are never capped at 999 — they simply grow (1000, 1001, …).
   */
  allocateIssueKey(clientId?: string, projectId?: string): string {
    const client = clientId ? this.clients.get(clientId) : undefined;
    const project = projectId ? this.projects.get(projectId) : undefined;
    const clientCode = sanitizeCode(client?.code) || "TASK";
    const projectCode = sanitizeCode(project?.code) || (project ? deriveCodeFromName(project.name) : "");
    const prefix = projectCode ? `${clientCode}-${projectCode}` : clientCode;

    let max = 0;
    const re = new RegExp(`^${escapeRegExp(prefix)}-(\\d+)$`, "i");
    for (const task of this.tasks.values()) {
      for (const key of [task.issueKey, task.id]) {
        if (!key) continue;
        const m = key.match(re);
        if (m) max = Math.max(max, Number(m[1]));
      }
    }
    return `${prefix}-${max + 1}`;
  }

  /** Allocate a unique task file id (= issue key when possible). */
  createTaskId(clientId?: string, projectId?: string): string {
    let id = this.allocateIssueKey(clientId, projectId);
    while (this.tasks.has(id)) {
      const m = id.match(/^(.*-)(\d+)$/);
      if (!m) {
        id = `${id}-${Date.now().toString(36)}`;
        break;
      }
      id = `${m[1]}${Number(m[2]) + 1}`;
    }
    return id;
  }

  ensureIssueKey(task: Task): Task {
    if (task.issueKey) return task;
    const key = this.allocateIssueKey(task.clientId, task.projectId);
    return { ...task, issueKey: key };
  }

  /** NN/g error prevention: parent cannot be Done while subtasks are open. */
  hasIncompleteSubtasks(task: Task): number {
    return (task.subtasks || []).filter(s => !s.completed).length;
  }

  canMarkDone(task: Task): boolean {
    return this.hasIncompleteSubtasks(task) === 0;
  }

  private rejectDoneIfSubtasksOpen(task: Task): boolean {
    const n = this.hasIncompleteSubtasks(task);
    if (n === 0) return false;
    showToast(t().announcements.subtasksBlockDone.replace("{n}", String(n)), "warning");
    return true;
  }

  private async spawnRecurringInstance(doneTask: Task): Promise<void> {
    const recurrence = doneTask.recurrence;
    if (recurrence !== "weekly" && recurrence !== "monthly") return;

    const newId = this.createTaskId(doneTask.clientId, doneTask.projectId);
    const now = new Date().toISOString();
    const next: Task = {
      ...cloneTask(doneTask),
      id: newId,
      status: "todo",
      startDate: shiftDate(doneTask.startDate, recurrence),
      dueDate: shiftDate(doneTask.dueDate, recurrence),
      timeLogs: [],
      timeSpentHours: undefined,
      comments: [],
      subtasks: doneTask.subtasks.map(s => ({
        ...s,
        id: `sub-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        completed: false,
      })),
      issueKey: newId,
      createdAt: now,
      updatedAt: now,
      order: doneTask.order,
    };

    this.tasks.set(next.id, next);
    try {
      await this.storage.saveTask(next);
    } catch {
      reportVaultError(this.storage);
    }
    showToast(`${t().announcements.recurringCreated}: ${next.issueKey || next.id}`, "success");
    this.notify();
  }

  private generateUniqueTaskId(): string {
    return this.createTaskId();
  }

  /**
   * Import/update tasks from a simple CSV with columns:
   * id,title,status,priority,dueDate,tags
   */
  async importTasksFromCsv(csvText: string): Promise<{ created: number; updated: number }> {
    const lines = csvText.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n").filter(l => l.trim());
    if (lines.length < 2) return { created: 0, updated: 0 };

    const parseRow = (line: string): string[] => {
      const cells: string[] = [];
      let cur = "";
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (inQuotes) {
          if (ch === '"' && line[i + 1] === '"') {
            cur += '"';
            i++;
          } else if (ch === '"') {
            inQuotes = false;
          } else {
            cur += ch;
          }
        } else if (ch === '"') {
          inQuotes = true;
        } else if (ch === ",") {
          cells.push(cur);
          cur = "";
        } else {
          cur += ch;
        }
      }
      cells.push(cur);
      return cells.map(c => c.trim());
    };

    const headers = parseRow(lines[0]).map(h => h.toLowerCase());
    const idx = (name: string) => headers.indexOf(name);

    const idIdx = idx("id");
    const titleIdx = idx("title");
    const statusIdx = idx("status");
    const priorityIdx = idx("priority");
    const dueIdx = idx("duedate");
    const tagsIdx = idx("tags");

    if (titleIdx < 0 && idIdx < 0) return { created: 0, updated: 0 };

    let created = 0;
    let updated = 0;
    const today = new Date().toISOString().slice(0, 10);
    const validPriorities = new Set(["urgent", "high", "normal", "low"]);

    for (let i = 1; i < lines.length; i++) {
      const cells = parseRow(lines[i]);
      if (!cells.some(c => c)) continue;

      const rawId = idIdx >= 0 ? cells[idIdx] : "";
      const title = titleIdx >= 0 ? cells[titleIdx] : "";
      if (!rawId && !title) continue;

      const existing = rawId ? this.tasks.get(rawId) : undefined;
      const statusRaw = statusIdx >= 0 ? cells[statusIdx] : "todo";
      const priorityRaw = priorityIdx >= 0 ? cells[priorityIdx] : "normal";
      const dueDate = dueIdx >= 0 && cells[dueIdx] ? cells[dueIdx] : today;
      const tagsRaw = tagsIdx >= 0 ? cells[tagsIdx] : "";
      const tags = tagsRaw
        ? tagsRaw.split(/[;|]/).map(s => s.trim()).filter(Boolean)
        : [];

      if (existing) {
        const next: Task = {
          ...cloneTask(existing),
          title: title || existing.title,
          status: (statusRaw || existing.status) as TaskStatus,
          priority: (validPriorities.has(priorityRaw) ? priorityRaw : existing.priority) as TaskPriority,
          dueDate: dueDate || existing.dueDate,
          tags: tags.length ? tags : existing.tags,
          updatedAt: new Date().toISOString(),
        };
        await this.saveOrUpdateTask(next);
        updated++;
      } else {
        const id = rawId || this.generateUniqueTaskId();
        if (this.tasks.has(id)) {
          const next: Task = {
            ...cloneTask(this.tasks.get(id)!),
            title: title || this.tasks.get(id)!.title,
            status: (statusRaw || "todo") as TaskStatus,
            priority: (validPriorities.has(priorityRaw) ? priorityRaw : "normal") as TaskPriority,
            dueDate,
            tags,
            updatedAt: new Date().toISOString(),
          };
          await this.saveOrUpdateTask(next);
          updated++;
        } else {
          const task: Task = this.ensureIssueKey({
            id,
            clientId: this.selectedClientId || undefined,
            projectId: this.selectedProjectId || undefined,
            title: title || id,
            description: "",
            status: (statusRaw || "todo") as TaskStatus,
            priority: (validPriorities.has(priorityRaw) ? priorityRaw : "normal") as TaskPriority,
            startDate: today,
            dueDate,
            tags,
            dependencies: [],
            subtasks: [],
            order: this.tasks.size,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
          await this.saveOrUpdateTask(task);
          created++;
        }
      }
    }

    return { created, updated };
  }

  async persistClients(): Promise<void> {
    await this.storage.saveClientsAndProjects({
      clients: this.getClients(),
      projects: this.getProjects(),
      members: this.getMembers(),
    });
    try {
      localStorage.setItem(MEMBERS_KEY, JSON.stringify(this.getMembers()));
    } catch {}
    reportVaultError(this.storage);
  }

  async addClient(client: Client): Promise<void> {
    this.clients.set(client.id, client);
    await this.persistClients();
    this.notify();
  }

  async updateClient(client: Client): Promise<void> {
    this.clients.set(client.id, client);
    await this.persistClients();
    this.notify();
  }

  async addClientContact(clientId: string, contact: ContactPerson): Promise<void> {
    const client = this.clients.get(clientId);
    if (!client) return;
    if (!client.contacts) client.contacts = [];
    client.contacts.push(contact);
    client.updatedAt = new Date().toISOString();
    await this.updateClient(client);
  }

  async updateClientContact(clientId: string, contact: ContactPerson): Promise<void> {
    const client = this.clients.get(clientId);
    if (!client || !client.contacts) return;
    const idx = client.contacts.findIndex(c => c.id === contact.id);
    if (idx !== -1) {
      client.contacts[idx] = contact;
      client.updatedAt = new Date().toISOString();
      await this.updateClient(client);
    }
  }

  async deleteClientContact(clientId: string, contactId: string): Promise<void> {
    const client = this.clients.get(clientId);
    if (!client || !client.contacts) return;
    client.contacts = client.contacts.filter(c => c.id !== contactId);
    client.updatedAt = new Date().toISOString();
    await this.updateClient(client);
  }

  async deleteClient(clientId: string, options?: { cascade?: boolean }): Promise<{ ok: boolean; blockedBy?: string }> {
    const linkedTasks = this.getAllRawTasks().filter(t => t.clientId === clientId);
    const linkedDocs = Array.from(this.docs.values()).filter(d => d.clientId === clientId);
    if ((linkedTasks.length > 0 || linkedDocs.length > 0) && !options?.cascade) {
      return {
        ok: false,
        blockedBy: `${linkedTasks.length} Aufgaben, ${linkedDocs.length} Docs`,
      };
    }

    if (options?.cascade) {
      for (const task of linkedTasks) {
        await this.deleteTask(task.id);
      }
      for (const doc of linkedDocs) {
        await this.deleteDoc(doc.id);
      }
    }

    this.clients.delete(clientId);
    for (const [pId, p] of this.projects.entries()) {
      if (p.clientId === clientId) {
        this.projects.delete(pId);
      }
    }
    await this.persistClients();
    this.notify();
    return { ok: true };
  }

  async addProject(project: Project): Promise<void> {
    this.projects.set(project.id, project);
    await this.persistClients();
    this.notify();
  }

  async updateProject(project: Project): Promise<void> {
    this.projects.set(project.id, project);
    await this.persistClients();
    this.notify();
  }

  async deleteProject(projectId: string, options?: { cascade?: boolean }): Promise<{ ok: boolean; blockedBy?: string }> {
    const linkedTasks = this.getAllRawTasks().filter(t => t.projectId === projectId);
    const linkedDocs = Array.from(this.docs.values()).filter(d => d.projectId === projectId);
    if ((linkedTasks.length > 0 || linkedDocs.length > 0) && !options?.cascade) {
      return {
        ok: false,
        blockedBy: `${linkedTasks.length} Aufgaben, ${linkedDocs.length} Docs`,
      };
    }

    if (options?.cascade) {
      for (const task of linkedTasks) {
        await this.deleteTask(task.id);
      }
      for (const doc of linkedDocs) {
        await this.deleteDoc(doc.id);
      }
    }

    this.projects.delete(projectId);
    await this.persistClients();
    this.notify();
    return { ok: true };
  }

  // --- Docs Hub Queries & Mutations ---
  getDocs(clientId?: string | null, projectId?: string | null): DocItem[] {
    let list = Array.from(this.docs.values());
    if (clientId) {
      list = list.filter(d => d.clientId === clientId);
    }
    if (projectId) {
      list = list.filter(d => d.projectId === projectId);
    }
    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase();
      list = list.filter(d => d.title.toLowerCase().includes(q) || d.content.toLowerCase().includes(q));
    }
    return list;
  }

  getDoc(id: string): DocItem | undefined {
    return this.docs.get(id);
  }

  async saveDoc(doc: DocItem): Promise<void> {
    const existing = this.docs.get(doc.id);
    const isNew = !existing;
    const oldSnapshot = existing ? { ...existing, tags: [...existing.tags] } : null;

    const cmd: Command = {
      description: isNew ? `Dokument "${doc.title}" erstellt` : `Dokument "${doc.title}" gespeichert`,
      execute: async () => {
        this.docs.set(doc.id, doc);
        await this.storage.saveDoc(doc);
      },
      undo: async () => {
        if (isNew) {
          this.docs.delete(doc.id);
          await this.storage.deleteDoc(doc.id);
        } else if (oldSnapshot) {
          this.docs.set(oldSnapshot.id, oldSnapshot);
          await this.storage.saveDoc(oldSnapshot);
        }
      },
    };

    await this.executeCommand(cmd);
  }

  async deleteDoc(docId: string): Promise<void> {
    const doc = this.docs.get(docId);
    if (!doc) return;
    const snapshot = { ...doc, tags: [...doc.tags] };

    const cmd: Command = {
      description: `Dokument "${doc.title}" gelöscht`,
      execute: async () => {
        this.docs.delete(docId);
        await this.storage.deleteDoc(docId);
        if (this.selectedDocId === docId) this.selectedDocId = null;
      },
      undo: async () => {
        this.docs.set(docId, snapshot);
        await this.storage.saveDoc(snapshot);
      },
    };

    await this.executeCommand(cmd);
  }

  // --- Task Multi-Filtering (Client + Project + Priority + Status + Quick + Search) ---
  getTasks(): Task[] {
    let result = Array.from(this.tasks.values());

    // Filter by Client
    if (this.selectedClientId) {
      result = result.filter(t => t.clientId === this.selectedClientId);
    }

    // Filter by Project
    if (this.selectedProjectId) {
      result = result.filter(t => t.projectId === this.selectedProjectId);
    }

    // Filter by Priority
    if (this.filterPriority !== "all") {
      result = result.filter(t => t.priority === this.filterPriority);
    }

    // Filter by Status
    if (this.filterStatus !== "all") {
      result = result.filter(t => t.status === this.filterStatus);
    }

    // Filter by Assignee
    if (this.filterAssignee !== "all") {
      result = result.filter(t => t.assigneeId === this.filterAssignee);
    }

    // Filter by Cycle / Sprint
    if (this.filterCycle.trim()) {
      const cycleQ = this.filterCycle.trim().toLowerCase();
      result = result.filter(t => (t.cycle || "").toLowerCase().includes(cycleQ));
    }

    // Quick Filters
    if (this.filterQuick !== "all") {
      const todayStr = new Date().toISOString().slice(0, 10);
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);
      const nextWeekStr = nextWeek.toISOString().slice(0, 10);

      if (this.filterQuick === "overdue") {
        result = result.filter(t => t.status !== "done" && t.dueDate && t.dueDate < todayStr);
      } else if (this.filterQuick === "due_soon") {
        result = result.filter(t => t.status !== "done" && t.dueDate && t.dueDate >= todayStr && t.dueDate <= nextWeekStr);
      } else if (this.filterQuick === "has_blocker") {
        result = result.filter(t => {
          if (!t.dependencies?.length || t.status === "done") return false;
          return t.dependencies.some(depId => {
            const dep = this.tasks.get(depId);
            return dep && dep.status !== "done";
          });
        });
      } else if (this.filterQuick === "no_date") {
        result = result.filter(t => !t.dueDate);
      }
    }

    // Fulltext Search
    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase();
      result = result.filter(t => 
        t.title.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.tags.some(tag => tag.toLowerCase().includes(q))
      );
    }

    // Visual Priority Sorting ("oben wichtig, unten unwichtig")
    const priorityWeight: Record<TaskPriority, number> = {
      urgent: 4,
      high: 3,
      normal: 2,
      low: 1,
    };

    result.sort((a, b) => {
      if (a.order !== b.order) {
        return a.order - b.order;
      }
      return priorityWeight[b.priority] - priorityWeight[a.priority];
    });

    return result;
  }

  async logTaskTime(taskId: string, hours: number, description?: string): Promise<void> {
    const task = this.tasks.get(taskId);
    if (!task || !Number.isFinite(hours) || hours <= 0) return;

    // Snapshot BEFORE mutating so undo restores prior time logs correctly
    const oldSnapshot = cloneTask(task);
    const entry: TimeEntry = {
      id: `time-${Date.now()}`,
      hours: Number(hours),
      date: new Date().toISOString().slice(0, 10),
      description,
      createdAt: new Date().toISOString(),
    };
    const updated: Task = {
      ...cloneTask(task),
      timeLogs: [...(task.timeLogs || []), entry],
      timeSpentHours: Number(((task.timeSpentHours || 0) + hours).toFixed(2)),
      updatedAt: new Date().toISOString(),
    };

    const cmd: Command = {
      description: `${t().announcements.timeLogged}: ${hours}h — ${task.title}`,
      execute: async () => {
        this.tasks.set(taskId, updated);
        try {
          await this.storage.saveTask(updated);
        } catch {
          reportVaultError(this.storage);
        }
      },
      undo: async () => {
        this.tasks.set(taskId, oldSnapshot);
        try {
          await this.storage.saveTask(oldSnapshot);
        } catch {
          reportVaultError(this.storage);
        }
      },
    };

    await this.executeCommand(cmd);
  }

  async reorderTasks(status: TaskStatus, taskIdsInOrder: string[]): Promise<void> {
    const snapshots = taskIdsInOrder
      .map(id => this.tasks.get(id))
      .filter((t): t is Task => !!t)
      .map(t => cloneTask(t));

    const newlyDoneCandidates = taskIdsInOrder.filter(id => {
      const t = this.tasks.get(id);
      return t && t.status !== "done" && status === "done";
    });

    for (const id of newlyDoneCandidates) {
      const t = this.tasks.get(id);
      if (t && this.rejectDoneIfSubtasksOpen(t)) {
        this.notify();
        return;
      }
    }

    const newlyDoneIds = newlyDoneCandidates;

    const cmd: Command = {
      description: `Aufgaben in ${status} neu sortiert`,
      execute: async () => {
        for (let i = 0; i < taskIdsInOrder.length; i++) {
          const task = this.tasks.get(taskIdsInOrder[i]);
          if (task) {
            task.order = i;
            task.status = status;
            task.updatedAt = new Date().toISOString();
            await this.storage.saveTask(task);
          }
        }
      },
      undo: async () => {
        for (const snap of snapshots) {
          this.tasks.set(snap.id, snap);
          await this.storage.saveTask(snap);
        }
      },
    };

    await this.executeCommand(cmd);
    for (const id of newlyDoneIds) {
      this.toastUnblocked(id);
      const done = this.tasks.get(id);
      if (done) await this.spawnRecurringInstance(done);
    }
  }

  getAllRawTasks(): Task[] {
    return Array.from(this.tasks.values());
  }

  clearFilters(): void {
    this.selectedClientId = null;
    this.selectedProjectId = null;
    this.filterPriority = "all";
    this.filterStatus = "all";
    this.filterQuick = "all";
    this.filterAssignee = "all";
    this.filterCycle = "";
    this.searchQuery = "";
    this.notify();
  }

  /** True when any task filter/search narrows the workspace view. */
  hasActiveTaskFilters(): boolean {
    return Boolean(
      this.selectedClientId ||
      this.selectedProjectId ||
      this.filterPriority !== "all" ||
      this.filterStatus !== "all" ||
      this.filterAssignee !== "all" ||
      this.filterCycle.trim() ||
      this.filterQuick !== "all" ||
      this.searchQuery.trim()
    );
  }

  /**
   * Returns true if assigning `newDeps` to `taskId` would introduce a dependency cycle.
   */
  wouldCreateDependencyCycle(taskId: string, newDeps: string[]): boolean {
    const getDeps = (id: string): string[] => {
      if (id === taskId) return newDeps;
      return this.tasks.get(id)?.dependencies || [];
    };

    const canReach = (from: string, target: string, seen: Set<string>): boolean => {
      if (from === target) return true;
      if (seen.has(from)) return false;
      seen.add(from);
      for (const dep of getDeps(from)) {
        if (canReach(dep, target, seen)) return true;
      }
      return false;
    };

    for (const dep of newDeps) {
      if (dep === taskId) return true;
      if (canReach(dep, taskId, new Set())) return true;
    }
    return false;
  }

  getTask(id: string): Task | undefined {
    return this.tasks.get(id);
  }

  // --- History & Actions ---
  async executeCommand(cmd: Command): Promise<void> {
    await cmd.execute();
    this.undoStack.push(cmd);
    this.redoStack = [];
    announcer.announce(cmd.description);
    this.notify();
  }

  async undo(): Promise<void> {
    const cmd = this.undoStack.pop();
    if (!cmd) return;
    await cmd.undo();
    this.redoStack.push(cmd);
    announcer.announce(`${t().announcements.undoPrefix}: ${cmd.description}`);
    this.notify();
  }

  async redo(): Promise<void> {
    const cmd = this.redoStack.pop();
    if (!cmd) return;
    await cmd.execute();
    this.undoStack.push(cmd);
    announcer.announce(`${t().announcements.redoPrefix}: ${cmd.description}`);
    this.notify();
  }

  async updateTaskStatus(taskId: string, newStatus: TaskStatus): Promise<void> {
    const task = this.tasks.get(taskId);
    if (!task || task.status === newStatus) return;

    if (newStatus === "done" && this.rejectDoneIfSubtasksOpen(task)) return;

    const oldStatus = task.status;
    const becameDone = newStatus === "done" && oldStatus !== "done";
    const snapshot = cloneTask(task);
    const cmd: Command = {
      description: `Aufgabe "${task.title}" nach ${newStatus} verschoben`,
      execute: async () => {
        task.status = newStatus;
        task.updatedAt = new Date().toISOString();
        await this.storage.saveTask(task);
      },
      undo: async () => {
        task.status = oldStatus;
        task.updatedAt = snapshot.updatedAt;
        await this.storage.saveTask(task);
      }
    };

    await this.executeCommand(cmd);
    if (becameDone) {
      this.toastUnblocked(taskId);
      await this.spawnRecurringInstance(snapshot);
    }
  }

  async toggleSubtask(taskId: string, subtaskId: string): Promise<void> {
    const task = this.tasks.get(taskId);
    if (!task) return;
    const next = cloneTask(task);
    const sub = next.subtasks.find(s => s.id === subtaskId);
    if (!sub) return;
    sub.completed = !sub.completed;
    next.updatedAt = new Date().toISOString();
    await this.saveOrUpdateTask(next);
  }

  async saveOrUpdateTask(updatedTask: Task): Promise<void> {
    let taskToSave = this.ensureIssueKey(updatedTask);
    const existing = this.tasks.get(taskToSave.id);
    const isNew = !existing;
    const oldSnapshot = existing ? cloneTask(existing) : null;
    const becameDone = !isNew && taskToSave.status === "done" && existing!.status !== "done";

    if (becameDone && this.rejectDoneIfSubtasksOpen(taskToSave)) return;
    if (isNew && taskToSave.status === "done" && this.rejectDoneIfSubtasksOpen(taskToSave)) return;

    const cmd: Command = {
      description: isNew
        ? `${t().announcements.taskCreated}: ${taskToSave.title}`
        : `${t().announcements.taskUpdated}: ${taskToSave.title}`,
      execute: async () => {
        this.tasks.set(taskToSave.id, taskToSave);
        try {
          await this.storage.saveTask(taskToSave);
        } catch {
          reportVaultError(this.storage);
        }
      },
      undo: async () => {
        if (isNew) {
          this.tasks.delete(taskToSave.id);
          await this.storage.deleteTask(taskToSave.id);
        } else if (oldSnapshot) {
          this.tasks.set(oldSnapshot.id, oldSnapshot);
          try {
            await this.storage.saveTask(oldSnapshot);
          } catch {
            reportVaultError(this.storage);
          }
        }
      }
    };

    await this.executeCommand(cmd);
    if (becameDone) {
      this.toastUnblocked(taskToSave.id);
      await this.spawnRecurringInstance({ ...taskToSave, status: "done" });
    }
  }

  async deleteTask(taskId: string): Promise<void> {
    const task = this.tasks.get(taskId);
    if (!task) return;

    const taskSnapshot = cloneTask(task);
    const cmd: Command = {
      description: `${t().announcements.taskDeleted}: ${task.title}`,
      execute: async () => {
        this.tasks.delete(taskId);
        await this.storage.deleteTask(taskId);
      },
      undo: async () => {
        this.tasks.set(taskId, taskSnapshot);
        try {
          await this.storage.saveTask(taskSnapshot);
        } catch {
          reportVaultError(this.storage);
        }
      }
    };

    await this.executeCommand(cmd);
  }
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function sanitizeCode(raw?: string): string {
  if (!raw) return "";
  return raw.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
}

/** Derive a short project code from its name when none is set. */
export function deriveCodeFromName(name?: string): string {
  if (!name?.trim()) return "";
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return words.map(w => w[0]).join("").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 4);
  }
  return name.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 4);
}

export const store = new AppStore();
