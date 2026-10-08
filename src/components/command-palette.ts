import { store } from "../storage/store";
import { getLanguage, t } from "../i18n";
import { toggleSidebar } from "../storage/sidebar-layout";
import { bestFuzzyScore } from "../utils/fuzzy-match";
import { getCommandRecents, pushCommandRecent } from "../storage/command-recents";
import { knowledgeTemplate } from "../storage/knowledge-templates";
import type { KnowledgeCategory } from "../types/knowledge";

export type PaletteOpenTask = (taskId: string) => void;

const SEARCH_DEBOUNCE_MS = 150;

type PaletteGroup = "recent" | "actions" | "views" | "tasks" | "archive" | "docs" | "knowledge" | "clients";

interface PaletteItem {
  id: string;
  label: string;
  shortcut?: string;
  group: PaletteGroup;
  fields: string[];
  action: () => void;
  score: number;
}

const EMPTY_GROUP_ORDER: PaletteGroup[] = ["recent", "actions", "views"];
const QUERY_GROUP_ORDER: PaletteGroup[] = ["tasks", "archive", "docs", "knowledge", "clients", "actions", "views"];

type CategoryI18nKey = keyof ReturnType<typeof t>["knowledge"]["categories"];

const CATEGORY_I18N_KEY: Record<KnowledgeCategory, CategoryI18nKey> = {
  colors: "colors",
  typography: "typography",
  "design-system": "designSystem",
  "blocks-sections": "blocksSections",
  "screens-views": "screensViews",
  "mission-vision": "missionVision",
  logic: "logic",
  other: "other",
};

function knowledgeCategoryLabel(category: KnowledgeCategory): string {
  return t().knowledge.categories[CATEGORY_I18N_KEY[category]];
}

function createNewKnowledgeFromPalette(): void {
  const clients = store.getClients();
  const clientId = store.selectedClientId || (clients.length > 0 ? clients[0].id : null);
  if (!clientId) {
    store.currentView = "knowledge";
    store.notify();
    return;
  }

  const category: KnowledgeCategory = "other";
  const newId = `KN-${String(Math.floor(100 + Math.random() * 900))}`;
  const locale = getLanguage();
  const newItem = {
    id: newId,
    clientId,
    projectId: store.selectedProjectId || undefined,
    category,
    title: t().knowledge.untitled,
    content: knowledgeTemplate(category, locale),
    tags: [] as string[],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  void store.saveKnowledge(newItem);
  store.selectedClientId = clientId;
  store.selectedKnowledgeId = newItem.id;
  store.currentView = "knowledge";
  store.notify();
}

export class CommandPalette {
  private dialog: HTMLDialogElement;
  private input: HTMLInputElement;
  private list: HTMLElement;
  private shortcutsDialog: HTMLDialogElement;
  private selectedIndex = 0;
  private currentItems: PaletteItem[] = [];
  private searchDebounceTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private onNewTask: () => void,
    private onNewDoc: () => void,
    private onOpenTask?: PaletteOpenTask
  ) {
    this.dialog = document.createElement("dialog");
    this.dialog.className = "command-dialog";
    this.dialog.setAttribute("aria-label", t().shortcuts.commandPalette);

    this.dialog.innerHTML = `
      <div class="command-search-header">
        <svg class="command-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
        <input type="text" class="command-search-input" role="combobox" aria-autocomplete="list" aria-controls="command-results" aria-expanded="true" placeholder="${t().actions.searchPlaceholder}" />
      </div>
      <div id="command-results" class="command-results-list" role="listbox"></div>
    `;

    document.body.appendChild(this.dialog);

    this.shortcutsDialog = document.createElement("dialog");
    this.shortcutsDialog.className = "shortcuts-help-dialog";
    this.shortcutsDialog.setAttribute("aria-labelledby", "shortcuts-help-title");
    document.body.appendChild(this.shortcutsDialog);

    this.input = this.dialog.querySelector(".command-search-input")!;
    this.list = this.dialog.querySelector(".command-results-list")!;

    this.dialog.addEventListener("click", (e) => {
      const rect = this.dialog.getBoundingClientRect();
      const inBox = (
        rect.top <= e.clientY &&
        e.clientY <= rect.top + rect.height &&
        rect.left <= e.clientX &&
        e.clientX <= rect.left + rect.width
      );
      if (!inBox) this.close();
    });

    this.shortcutsDialog.addEventListener("click", (e) => {
      const rect = this.shortcutsDialog.getBoundingClientRect();
      const inBox = (
        rect.top <= e.clientY &&
        e.clientY <= rect.top + rect.height &&
        rect.left <= e.clientX &&
        e.clientX <= rect.left + rect.width
      );
      if (!inBox) this.shortcutsDialog.close();
    });

    this.input.addEventListener("input", () => this.filter(this.input.value));

    this.input.addEventListener("keydown", (e) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        if (this.currentItems.length === 0) return;
        this.selectedIndex = Math.min(this.selectedIndex + 1, this.currentItems.length - 1);
        this.renderItems();
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        if (this.currentItems.length === 0) return;
        this.selectedIndex = Math.max(this.selectedIndex - 1, 0);
        this.renderItems();
      } else if (e.key === "Home") {
        e.preventDefault();
        if (this.currentItems.length === 0) return;
        this.selectedIndex = 0;
        this.renderItems();
      } else if (e.key === "End") {
        e.preventDefault();
        if (this.currentItems.length === 0) return;
        this.selectedIndex = this.currentItems.length - 1;
        this.renderItems();
      } else if (e.key === "Enter") {
        e.preventDefault();
        const selected = this.currentItems[this.selectedIndex];
        if (selected) {
          selected.action();
          this.close();
        }
      } else if (e.key === "Escape") {
        this.close();
      }
    });
  }

  public open(initialQuery = ""): void {
    this.input.value = initialQuery;
    this.selectedIndex = 0;
    this.filter(initialQuery);
    this.dialog.showModal();
    this.input.focus();
    this.input.select();
  }

  public close(): void {
    if (this.searchDebounceTimer !== null) {
      clearTimeout(this.searchDebounceTimer);
      this.searchDebounceTimer = null;
    }
    this.dialog.close();
  }

  private scheduleLiveSearch(query: string): void {
    if (this.searchDebounceTimer !== null) {
      clearTimeout(this.searchDebounceTimer);
    }
    this.searchDebounceTimer = setTimeout(() => {
      this.searchDebounceTimer = null;
      const next = query.trim();
      if (store.searchQuery === next) return;
      store.searchQuery = next;
      store.notify();
    }, SEARCH_DEBOUNCE_MS);
  }

  public openShortcutsHelp(): void {
    const s = t().shortcuts;
    const rows: Array<[string, string]> = [
      [s.commandPalette, "⌘K"],
      [s.newTask, "N"],
      [s.newDoc, "D"],
      [s.undo, "⌘Z"],
      [s.redo, "⌘⇧Z"],
      [s.viewKanban, "1"],
      [s.viewList, "2"],
      [s.viewGantt, "3"],
      [s.viewDocs, "4"],
      [s.viewBackoffice, "5"],
      [s.toggleSidebar, "⌘\\"],
    ];

    this.shortcutsDialog.innerHTML = `
      <div class="shortcuts-help-header">
        <h2 id="shortcuts-help-title">${escapeHtml(s.title)}</h2>
        <button type="button" class="btn btn-ghost btn-icon shortcuts-help-close" aria-label="${t().actions.close}">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
        </button>
      </div>
      <ul class="shortcuts-help-list">
        ${rows.map(([label, key]) => `
          <li class="shortcuts-help-item">
            <span>${escapeHtml(label)}</span>
            <kbd class="shortcuts-help-kbd">${escapeHtml(key)}</kbd>
          </li>
        `).join("")}
      </ul>
    `;

    this.shortcutsDialog.querySelector(".shortcuts-help-close")?.addEventListener("click", () => {
      this.shortcutsDialog.close();
    });

    this.shortcutsDialog.showModal();
  }

  private groupLabel(group: PaletteGroup): string {
    const c = t().command;
    if (group === "recent") return c.groupRecent;
    if (group === "actions") return c.groupActions;
    if (group === "views") return c.groupViews;
    if (group === "tasks") return c.groupTasks;
    if (group === "archive") return c.groupArchive;
    if (group === "knowledge") return c.groupKnowledge;
    if (group === "clients") return c.groupClients;
    return c.groupDocs;
  }

  private buildCatalog(): PaletteItem[] {
    const i18n = t();
    const show = (view: string) => i18n.command.showView.replace("{view}", view);

    const actions: PaletteItem[] = [
      {
        id: "action-new-task",
        label: i18n.actions.newTask,
        shortcut: "N",
        group: "actions",
        fields: [i18n.actions.newTask, "new task", "aufgabe"],
        score: 0,
        action: () => this.onNewTask(),
      },
      {
        id: "action-new-doc",
        label: i18n.actions.newDoc,
        shortcut: "D",
        group: "actions",
        fields: [i18n.actions.newDoc, "new doc", "dokument"],
        score: 0,
        action: () => this.onNewDoc(),
      },
      {
        id: "action-new-knowledge",
        label: i18n.actions.newKnowledge,
        group: "actions",
        fields: [i18n.actions.newKnowledge, "new knowledge", "wissen", "knowledge"],
        score: 0,
        action: () => createNewKnowledgeFromPalette(),
      },
      {
        id: "action-shortcuts",
        label: i18n.shortcuts.show,
        shortcut: "?",
        group: "actions",
        fields: [i18n.shortcuts.show, "shortcuts", "hilfe"],
        score: 0,
        action: () => this.openShortcutsHelp(),
      },
      {
        id: "action-undo",
        label: i18n.actions.undo,
        shortcut: "⌘Z",
        group: "actions",
        fields: [i18n.actions.undo, "undo"],
        score: 0,
        action: () => store.undo(),
      },
      {
        id: "action-redo",
        label: i18n.actions.redo,
        shortcut: "⌘⇧Z",
        group: "actions",
        fields: [i18n.actions.redo, "redo"],
        score: 0,
        action: () => store.redo(),
      },
      {
        id: "action-sidebar",
        label: i18n.shortcuts.toggleSidebar,
        shortcut: "⌘\\",
        group: "actions",
        fields: [i18n.shortcuts.toggleSidebar, "sidebar"],
        score: 0,
        action: () => { toggleSidebar(); store.notify(); },
      },
    ];

    const views: PaletteItem[] = [
      {
        id: "view-dashboard",
        label: show(i18n.views.dashboard),
        group: "views",
        fields: [i18n.views.dashboard, "übersicht", "overview", "dashboard", "home"],
        score: 0,
        action: () => { store.currentView = "dashboard"; store.notify(); },
      },
      {
        id: "view-kanban",
        label: show(i18n.views.kanban),
        shortcut: "1",
        group: "views",
        fields: [i18n.views.kanban, "board", "kanban"],
        score: 0,
        action: () => { store.currentView = "kanban"; store.notify(); },
      },
      {
        id: "view-list",
        label: show(i18n.views.list),
        shortcut: "2",
        group: "views",
        fields: [i18n.views.list, "list", "liste"],
        score: 0,
        action: () => { store.currentView = "list"; store.notify(); },
      },
      {
        id: "view-gantt",
        label: show(i18n.views.gantt),
        shortcut: "3",
        group: "views",
        fields: [i18n.views.gantt, "gantt", "timeline"],
        score: 0,
        action: () => { store.currentView = "gantt"; store.notify(); },
      },
      {
        id: "view-docs",
        label: show(i18n.views.docs),
        shortcut: "4",
        group: "views",
        fields: [i18n.views.docs, "docs", "dokumente"],
        score: 0,
        action: () => { store.currentView = "docs"; store.notify(); },
      },
      {
        id: "view-knowledge",
        label: show(i18n.views.knowledge),
        group: "views",
        fields: [i18n.views.knowledge, "knowledge", "wissen"],
        score: 0,
        action: () => { store.currentView = "knowledge"; store.notify(); },
      },
      {
        id: "view-backoffice",
        label: show(i18n.views.backoffice),
        shortcut: "5",
        group: "views",
        fields: [i18n.views.backoffice, "backoffice"],
        score: 0,
        action: () => { store.currentView = "backoffice"; store.notify(); },
      },
      {
        id: "view-calendar",
        label: show(i18n.views.calendar),
        group: "views",
        fields: [i18n.views.calendar, "calendar", "kalender"],
        score: 0,
        action: () => { store.currentView = "calendar"; store.notify(); },
      },
    ];

    const archivedTasks: PaletteItem[] = store.getArchivedTasks().map(task => {
      const key = task.issueKey || task.id;
      const label = i18n.command.taskLabel
        .replace("{key}", key)
        .replace("{title}", task.title);
      return {
        id: `archived-${task.id}`,
        label,
        shortcut: "archive",
        group: "archive" as const,
        fields: [key, task.id, task.title, task.description, ...(task.tags || []), "archiv", "archive"],
        score: 0,
        action: () => {
          pushCommandRecent({ kind: "task", id: task.id });
          store.currentView = "list";
          store.notify();
          this.onOpenTask?.(task.id);
        },
      };
    });

    const tasks: PaletteItem[] = store.getAllRawTasks().map(task => {
      const key = task.issueKey || task.id;
      const label = i18n.command.taskLabel
        .replace("{key}", key)
        .replace("{title}", task.title);
      return {
        id: `task-${task.id}`,
        label,
        shortcut: task.status,
        group: "tasks" as const,
        fields: [key, task.id, task.title, task.description, ...(task.tags || [])],
        score: 0,
        action: () => {
          pushCommandRecent({ kind: "task", id: task.id });
          store.currentView = "kanban";
          store.notify();
          this.onOpenTask?.(task.id);
        },
      };
    });

    const docs: PaletteItem[] = store.getDocs().map(doc => ({
      id: `doc-${doc.id}`,
      label: i18n.command.docLabel.replace("{title}", doc.title),
      shortcut: "Doc",
      group: "docs" as const,
      fields: [doc.title, doc.id, ...(doc.tags || [])],
      score: 0,
      action: () => {
        pushCommandRecent({ kind: "doc", id: doc.id });
        store.selectedDocId = doc.id;
        store.currentView = "docs";
        store.notify();
      },
    }));

    const knowledge: PaletteItem[] = store.getKnowledge().map(item => {
      const catLabel = knowledgeCategoryLabel(item.category);
      const title = item.title || i18n.knowledge.untitled;
      return {
        id: `knowledge-${item.id}`,
        label: title,
        shortcut: catLabel,
        group: "knowledge" as const,
        fields: [title, item.id, item.category, catLabel, ...(item.tags || [])],
        score: 0,
        action: () => {
          pushCommandRecent({ kind: "knowledge", id: item.id });
          store.selectedClientId = item.clientId;
          store.selectedProjectId = item.projectId || null;
          store.selectedKnowledgeId = item.id;
          store.currentView = "knowledge";
          store.notify();
        },
      };
    });

    const clients: PaletteItem[] = store.getClients().map(client => ({
      id: `client-${client.id}`,
      label: i18n.command.clientLabel.replace("{name}", client.name),
      shortcut: client.code,
      group: "clients" as const,
      fields: [client.name, client.code, client.id, client.industry || "", client.email || ""],
      score: 0,
      action: () => {
        store.selectedClientId = client.id;
        store.selectedProjectId = null;
        store.currentView = "client";
        store.notify();
      },
    }));

    const recents: PaletteItem[] = [];
    for (const recent of getCommandRecents()) {
      if (recent.kind === "task") {
        const task = store.getTaskById(recent.id);
        if (!task) continue;
        const key = task.issueKey || task.id;
        recents.push({
          id: `recent-task-${task.id}`,
          label: i18n.command.taskLabel.replace("{key}", key).replace("{title}", task.title),
          shortcut: task.status,
          group: "recent",
          fields: [key, task.title],
          score: 0,
          action: () => {
            pushCommandRecent({ kind: "task", id: task.id });
            store.currentView = "kanban";
            store.notify();
            this.onOpenTask?.(task.id);
          },
        });
      } else if (recent.kind === "knowledge") {
        const item = store.getKnowledgeItem(recent.id);
        if (!item) continue;
        const title = item.title || i18n.knowledge.untitled;
        const catLabel = knowledgeCategoryLabel(item.category);
        recents.push({
          id: `recent-knowledge-${item.id}`,
          label: title,
          shortcut: catLabel,
          group: "recent",
          fields: [title, catLabel],
          score: 0,
          action: () => {
            pushCommandRecent({ kind: "knowledge", id: item.id });
            store.selectedClientId = item.clientId;
            store.selectedProjectId = item.projectId || null;
            store.selectedKnowledgeId = item.id;
            store.currentView = "knowledge";
            store.notify();
          },
        });
      } else {
        const doc = store.getDocs().find(d => d.id === recent.id);
        if (!doc) continue;
        recents.push({
          id: `recent-doc-${doc.id}`,
          label: i18n.command.docLabel.replace("{title}", doc.title),
          shortcut: "Doc",
          group: "recent",
          fields: [doc.title],
          score: 0,
          action: () => {
            pushCommandRecent({ kind: "doc", id: doc.id });
            store.selectedDocId = doc.id;
            store.currentView = "docs";
            store.notify();
          },
        });
      }
    }

    return [...recents, ...actions, ...views, ...tasks, ...archivedTasks, ...docs, ...knowledge, ...clients];
  }

  private filter(query: string): void {
    const q = query.toLowerCase().trim();
    this.scheduleLiveSearch(query);

    const catalog = this.buildCatalog();
    const order = q ? QUERY_GROUP_ORDER : EMPTY_GROUP_ORDER;

    let items: PaletteItem[] = [];

    if (!q) {
      items = catalog.filter(item => order.includes(item.group));
    } else {
      const applySearch: PaletteItem = {
        id: "action-apply-search",
        label: t().command.applySearch.replace("{q}", query.trim()),
        shortcut: "Filter",
        group: "actions",
        fields: [query, "search", "filter", "suche"],
        score: 850,
        action: () => {
          if (this.searchDebounceTimer !== null) {
            clearTimeout(this.searchDebounceTimer);
            this.searchDebounceTimer = null;
          }
          store.searchQuery = query.trim();
          store.currentView = "kanban";
          store.notify();
        },
      };

      const scored = catalog
        .filter(item => item.group !== "recent")
        .map(item => ({
          ...item,
          score: bestFuzzyScore(q, [...item.fields, item.label]),
        }))
        .filter(item => item.score > 0);

      items = [applySearch, ...scored].sort((a, b) => {
        if (a.group !== b.group) {
          return order.indexOf(a.group) - order.indexOf(b.group);
        }
        return b.score - a.score;
      });
    }

    // Stable group order for empty query
    if (!q) {
      items.sort((a, b) => order.indexOf(a.group) - order.indexOf(b.group));
    }

    this.currentItems = items;
    this.selectedIndex = 0;
    this.renderItems();
  }

  private renderItems(): void {
    this.list.innerHTML = "";
    if (this.currentItems.length === 0) {
      this.list.innerHTML = `<p class="command-empty">${escapeHtml(t().command.noResults)}</p>`;
      this.input.removeAttribute("aria-activedescendant");
      return;
    }

    let lastGroup: PaletteGroup | null = null;
    let currentGroupEl: HTMLElement | null = null;

    this.currentItems.forEach((item, idx) => {
      if (item.group !== lastGroup) {
        lastGroup = item.group;
        const header = document.createElement("div");
        header.className = "command-group-header";
        header.setAttribute("role", "presentation");
        header.textContent = this.groupLabel(item.group);
        this.list.appendChild(header);

        currentGroupEl = document.createElement("div");
        currentGroupEl.className = "command-group";
        currentGroupEl.setAttribute("role", "group");
        currentGroupEl.setAttribute("aria-label", this.groupLabel(item.group));
        this.list.appendChild(currentGroupEl);
      }

      const host = currentGroupEl || this.list;
      const isFocused = idx === this.selectedIndex;
      const el = document.createElement("div");
      el.className = `command-item ${isFocused ? "focused" : ""}`;
      el.setAttribute("role", "option");
      el.setAttribute("aria-selected", String(isFocused));
      el.id = `command-option-${idx}`;

      el.innerHTML = `
        <span class="command-item-label">${escapeHtml(item.label)}</span>
        ${item.shortcut ? `<span class="command-shortcut-badge">${escapeHtml(item.shortcut)}</span>` : ""}
      `;

      el.addEventListener("click", () => {
        item.action();
        this.close();
      });

      host.appendChild(el);
    });

    this.input.setAttribute("aria-activedescendant", `command-option-${this.selectedIndex}`);
    const focused = this.list.querySelector(`#command-option-${this.selectedIndex}`);
    focused?.scrollIntoView({ block: "nearest" });
  }
}

function escapeHtml(text: string): string {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}
