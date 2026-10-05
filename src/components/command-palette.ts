import { store } from "../storage/store";
import { t } from "../i18n";
import { toggleSidebar } from "../storage/sidebar-layout";

export type PaletteOpenTask = (taskId: string) => void;

export class CommandPalette {
  private dialog: HTMLDialogElement;
  private input: HTMLInputElement;
  private list: HTMLElement;
  private shortcutsDialog: HTMLDialogElement;
  private selectedIndex = 0;
  private currentItems: Array<{ label: string; shortcut?: string; action: () => void }> = [];

  constructor(
    private onNewTask: () => void,
    private onNewDoc: () => void,
    private onOpenTask?: PaletteOpenTask
  ) {
    this.dialog = document.createElement("dialog");
    this.dialog.className = "command-dialog";
    this.dialog.setAttribute("aria-label", "Command Palette");

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
        this.selectedIndex = Math.min(this.selectedIndex + 1, this.currentItems.length - 1);
        this.renderItems();
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        this.selectedIndex = Math.max(this.selectedIndex - 1, 0);
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
    this.dialog.close();
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

  private filter(query: string): void {
    const q = query.toLowerCase().trim();

    store.searchQuery = q;

    const baseItems: Array<{ label: string; shortcut?: string; action: () => void }> = [
      {
        label: t().actions.newTask,
        shortcut: "N",
        action: () => this.onNewTask(),
      },
      {
        label: t().actions.newDoc,
        shortcut: "D",
        action: () => this.onNewDoc(),
      },
      {
        label: t().shortcuts.show,
        shortcut: "?",
        action: () => this.openShortcutsHelp(),
      },
      {
        label: `${t().views.kanban} anzeigen`,
        shortcut: "1",
        action: () => { store.currentView = "kanban"; store.notify(); },
      },
      {
        label: `${t().views.list} anzeigen`,
        shortcut: "2",
        action: () => { store.currentView = "list"; store.notify(); },
      },
      {
        label: `${t().views.gantt} anzeigen`,
        shortcut: "3",
        action: () => { store.currentView = "gantt"; store.notify(); },
      },
      {
        label: `${t().views.docs} anzeigen`,
        shortcut: "4",
        action: () => { store.currentView = "docs"; store.notify(); },
      },
      {
        label: `${t().views.backoffice} anzeigen`,
        shortcut: "5",
        action: () => { store.currentView = "backoffice"; store.notify(); },
      },
      {
        label: `${t().views.calendar} anzeigen`,
        action: () => { store.currentView = "calendar"; store.notify(); },
      },
      {
        label: t().shortcuts.toggleSidebar,
        shortcut: "⌘\\",
        action: () => { toggleSidebar(); store.notify(); },
      },
      {
        label: t().actions.undo,
        shortcut: "⌘Z",
        action: () => store.undo(),
      },
      {
        label: t().actions.redo,
        shortcut: "⌘⇧Z",
        action: () => store.redo(),
      },
    ];

    if (q) {
      baseItems.unshift({
        label: `Suche nach „${query}“ im Board anwenden`,
        shortcut: "Filter",
        action: () => {
          store.searchQuery = query.trim();
          store.currentView = "kanban";
          store.notify();
        },
      });
    }

    store.getAllRawTasks().forEach(task => {
      baseItems.push({
        label: `Aufgabe: ${task.id} - ${task.title}`,
        shortcut: task.status,
        action: () => {
          store.currentView = "kanban";
          store.notify();
          this.onOpenTask?.(task.id);
        },
      });
    });

    store.getDocs().forEach(doc => {
      baseItems.push({
        label: `Doc: ${doc.title}`,
        shortcut: "Doc",
        action: () => {
          store.selectedDocId = doc.id;
          store.currentView = "docs";
          store.notify();
        },
      });
    });

    if (q) {
      this.currentItems = baseItems.filter(item => item.label.toLowerCase().includes(q));
    } else {
      this.currentItems = baseItems;
    }

    this.selectedIndex = 0;
    this.renderItems();
  }

  private renderItems(): void {
    this.list.innerHTML = "";
    if (this.currentItems.length === 0) {
      this.list.innerHTML = `<p style="font-size: var(--font-size-xs); color: var(--color-text-muted); padding: var(--space-3); text-align: center;">Keine Ergebnisse gefunden</p>`;
      return;
    }

    this.currentItems.forEach((item, idx) => {
      const isFocused = idx === this.selectedIndex;
      const el = document.createElement("div");
      el.className = `command-item ${isFocused ? "focused" : ""}`;
      el.setAttribute("role", "option");
      el.setAttribute("aria-selected", String(isFocused));
      el.id = `command-option-${idx}`;

      el.innerHTML = `
        <span>${escapeHtml(item.label)}</span>
        ${item.shortcut ? `<span class="command-shortcut-badge">${escapeHtml(item.shortcut)}</span>` : ""}
      `;

      el.addEventListener("click", () => {
        item.action();
        this.close();
      });

      this.list.appendChild(el);
    });

    this.input.setAttribute("aria-activedescendant", `command-option-${this.selectedIndex}`);
  }
}

function escapeHtml(text: string): string {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}
