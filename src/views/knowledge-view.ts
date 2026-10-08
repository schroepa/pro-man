import { store } from "../storage/store";
import { knowledgeTemplate } from "../storage/knowledge-templates";
import {
  KNOWLEDGE_CATEGORIES,
  type KnowledgeCategory,
  type KnowledgeItem,
  type KnowledgeListEntry,
} from "../types/knowledge";
import { getLanguage, t } from "../i18n";
import { CustomSelect } from "../components/custom-select";
import { MarkdownLiveField } from "../components/markdown-live-field";

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

let knowledgeListQuery = "";

function categoryLabel(category: KnowledgeCategory): string {
  return t().knowledge.categories[CATEGORY_I18N_KEY[category]];
}

export function renderKnowledgeView(container: HTMLElement): void {
  container.innerHTML = "";

  if (!store.selectedClientId) {
    container.innerHTML = `
      <div class="docs-hub-container knowledge-hub knowledge-hub--empty" role="region" aria-label="${escapeHtml(t().views.knowledge)}">
        <p class="knowledge-empty-state">${escapeHtml(t().knowledge.noClientContext)}</p>
      </div>
    `;
    return;
  }

  const clientId = store.selectedClientId;
  const projectId = store.selectedProjectId;

  const entries: KnowledgeListEntry[] = projectId
    ? store.getKnowledgeForProjectView(clientId, projectId)
    : store.getKnowledge(clientId).map(item => ({ item, readOnly: false }));

  const q = knowledgeListQuery.trim().toLowerCase();
  const filtered = q
    ? entries.filter(({ item }) =>
        item.title.toLowerCase().includes(q) ||
        item.content.toLowerCase().includes(q) ||
        item.tags.some(tag => tag.toLowerCase().includes(q)) ||
        categoryLabel(item.category).toLowerCase().includes(q)
      )
    : entries;

  const activeId =
    store.selectedKnowledgeId && filtered.some(e => e.item.id === store.selectedKnowledgeId)
      ? store.selectedKnowledgeId
      : (filtered[0]?.item.id ?? null);
  const activeEntry = activeId ? filtered.find(e => e.item.id === activeId) ?? null : null;
  const active = activeEntry?.item ?? null;
  const editable = active ? store.canEditKnowledge(active) : false;

  const wrapper = document.createElement("div");
  wrapper.className = "docs-hub-container knowledge-hub";
  wrapper.setAttribute("role", "region");
  wrapper.setAttribute("aria-label", t().views.knowledge);

  const sidebar = document.createElement("div");
  sidebar.className = "docs-list-sidebar";

  const byCategory = new Map<KnowledgeCategory, KnowledgeListEntry[]>();
  for (const cat of KNOWLEDGE_CATEGORIES) byCategory.set(cat, []);
  for (const entry of filtered) {
    const list = byCategory.get(entry.item.category) ?? byCategory.get("other")!;
    list.push(entry);
  }

  const groupHtml = KNOWLEDGE_CATEGORIES.map(cat => {
    const nodes = byCategory.get(cat) || [];
    if (nodes.length === 0) return "";
    return `
      <div class="docs-project-group knowledge-category-group">
        <div class="docs-project-group-label">${escapeHtml(categoryLabel(cat))}</div>
        ${nodes.map(({ item, readOnly }) => {
          const isActive = item.id === activeId;
          return `
            <div class="doc-card-item doc-card-compact ${isActive ? "active" : ""}" role="button" tabindex="0" data-knowledge-id="${escapeHtml(item.id)}">
              <span class="doc-card-title">${escapeHtml(item.title || t().knowledge.untitled)}</span>
              <span class="knowledge-card-meta">
                ${readOnly ? `<span class="knowledge-client-badge">${escapeHtml(t().knowledge.clientBadge)}</span>` : ""}
                <span class="doc-card-meta-date">${formatDate(item.updatedAt)}</span>
              </span>
            </div>
          `;
        }).join("")}
      </div>
    `;
  }).join("");

  sidebar.innerHTML = `
    <div class="docs-list-header">
      <span style="font-size: var(--font-size-xs); font-weight: var(--font-weight-semibold); color: var(--color-text-secondary); text-transform: uppercase;">
        ${escapeHtml(t().views.knowledge)} (${filtered.length})
      </span>
      <button id="add-knowledge-btn" class="btn btn-ghost btn-icon" title="${escapeHtml(t().actions.newKnowledge)}" aria-label="${escapeHtml(t().actions.newKnowledge)}">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>
      </button>
    </div>

    <div class="docs-list-search">
      <input type="search" id="knowledge-search-input" class="input" value="${escapeHtml(knowledgeListQuery)}" placeholder="${escapeHtml(t().knowledge.searchPlaceholder)}" aria-label="${escapeHtml(t().knowledge.searchPlaceholder)}" />
    </div>

    <div class="docs-items-scroll">
      ${filtered.length === 0 ? `
        <p style="font-size: var(--font-size-xs); color: var(--color-text-muted); padding: var(--space-4); text-align: center;">
          ${escapeHtml(t().knowledge.noItems)}
        </p>
      ` : groupHtml}
    </div>
  `;

  const canvas = document.createElement("div");
  canvas.className = "doc-editor-canvas";

  if (active) {
    canvas.innerHTML = `
      ${!editable ? `
        <div class="knowledge-readonly-banner" role="status">
          <p class="knowledge-readonly-hint">${escapeHtml(t().knowledge.readOnlyHint)}</p>
          <button type="button" id="knowledge-edit-at-client" class="btn btn-secondary">${escapeHtml(t().knowledge.editAtClient)}</button>
        </div>
      ` : ""}
      <div class="doc-editor-header">
        <div class="doc-scope-selects" style="display: flex; gap: var(--space-2); align-items: center; flex-wrap: wrap;">
          <div id="knowledge-category-mount"></div>
        </div>
        ${editable ? `
          <button id="delete-knowledge-btn" class="btn btn-ghost" style="color: #ef4444; font-size: var(--font-size-xs);">
            ${escapeHtml(t().actions.delete)}
          </button>
        ` : ""}
      </div>

      <input type="text" id="knowledge-title-input" class="doc-title-input" value="${escapeHtml(active.title)}" placeholder="${escapeHtml(t().knowledge.title)}" ${editable ? "" : "readonly disabled"} />

      <div class="doc-metadata-bar">
        <span>${escapeHtml(t().docs.updated)}: ${new Date(active.updatedAt).toLocaleString()}</span>
      </div>

      <div id="knowledge-content-mount" class="doc-content-mount knowledge-content-mount ${editable ? "" : "is-readonly"}"></div>
    `;

    const titleInput = canvas.querySelector<HTMLInputElement>("#knowledge-title-input")!;
    const contentMount = canvas.querySelector<HTMLElement>("#knowledge-content-mount")!;

    const contentField = new MarkdownLiveField({
      id: "knowledge-content-textarea",
      value: active.content,
      placeholder: t().knowledge.contentPlaceholder,
      editHint: t().knowledge.contentMarkdownHint,
      minRows: 12,
      className: "md-live-field--knowledge",
      onInput: editable ? () => triggerSave() : undefined,
      onRenderView: (viewEl) => bindKnowledgeWikilinks(viewEl),
    });
    contentMount.appendChild(contentField.getElement());

    if (!editable) {
      contentField.getElement().setAttribute("aria-disabled", "true");
      const view = contentField.getElement().querySelector<HTMLElement>(".md-live-view");
      if (view) {
        view.removeAttribute("tabindex");
        view.setAttribute("role", "article");
      }
    }

    let selectedCategory: KnowledgeCategory = active.category;

    const categorySelect = new CustomSelect({
      options: KNOWLEDGE_CATEGORIES.map(cat => ({
        value: cat,
        label: categoryLabel(cat),
      })),
      selectedValue: active.category,
      ariaLabel: t().knowledge.createCategoryPrompt,
      onChange: (val) => {
        if (!editable) return;
        if ((KNOWLEDGE_CATEGORIES as readonly string[]).includes(val)) {
          selectedCategory = val as KnowledgeCategory;
          triggerSave();
        }
      },
    });
    canvas.querySelector("#knowledge-category-mount")?.appendChild(categorySelect.getElement());
    if (!editable) {
      categorySelect.getElement().classList.add("is-disabled");
      categorySelect.getElement().setAttribute("aria-disabled", "true");
      const trigger = categorySelect.getElement().querySelector<HTMLButtonElement>(".custom-select-trigger");
      if (trigger) trigger.disabled = true;
    }

    let saveTimeout: ReturnType<typeof setTimeout> | null = null;
    const triggerSave = () => {
      if (!editable) return;
      if (saveTimeout) clearTimeout(saveTimeout);
      saveTimeout = setTimeout(() => {
        const updated: KnowledgeItem = {
          ...active,
          title: titleInput.value.trim() || t().knowledge.untitled,
          content: contentField.getValue(),
          category: selectedCategory,
          updatedAt: new Date().toISOString(),
        };
        void store.saveKnowledge(updated);
      }, 400);
    };

    if (editable) {
      titleInput.addEventListener("input", triggerSave);
      canvas.querySelector("#delete-knowledge-btn")?.addEventListener("click", async () => {
        if (confirm(`Wissen "${active.title}" wirklich löschen?`)) {
          await store.deleteKnowledge(active.id);
          store.selectedKnowledgeId = null;
          store.notify();
        }
      });
    }

    canvas.querySelector("#knowledge-edit-at-client")?.addEventListener("click", () => {
      store.selectedProjectId = null;
      store.selectedKnowledgeId = active.id;
      store.notify();
    });
  } else {
    canvas.innerHTML = `
      <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; color: var(--color-text-muted); gap: var(--space-3);">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
        <p style="font-size: var(--font-size-sm);">${escapeHtml(t().knowledge.selectToView)}</p>
        <button id="empty-add-knowledge-btn" class="btn btn-primary">${escapeHtml(t().actions.newKnowledge)}</button>
      </div>
    `;

    canvas.querySelector("#empty-add-knowledge-btn")?.addEventListener("click", () => {
      createNewKnowledge();
    });
  }

  const selectKnowledge = (id: string) => {
    store.selectedKnowledgeId = id;
    store.notify();
  };

  sidebar.addEventListener("click", (e) => {
    const target = e.target as HTMLElement;
    const card = target.closest<HTMLElement>("[data-knowledge-id]");
    if (card?.dataset.knowledgeId) {
      selectKnowledge(card.dataset.knowledgeId);
    }
  });

  sidebar.addEventListener("keydown", (e) => {
    const ke = e as KeyboardEvent;
    if (ke.key !== "Enter" && ke.key !== " ") return;
    const target = ke.target as HTMLElement;
    const card = target.closest<HTMLElement>("[data-knowledge-id]");
    if (card && target === card && card.dataset.knowledgeId) {
      ke.preventDefault();
      selectKnowledge(card.dataset.knowledgeId);
    }
  });

  sidebar.querySelector("#add-knowledge-btn")?.addEventListener("click", () => {
    createNewKnowledge();
  });

  const searchInput = sidebar.querySelector<HTMLInputElement>("#knowledge-search-input");
  searchInput?.addEventListener("input", () => {
    knowledgeListQuery = searchInput.value;
    renderKnowledgeView(container);
    const again = container.querySelector<HTMLInputElement>("#knowledge-search-input");
    if (again) {
      again.focus();
      const len = again.value.length;
      again.setSelectionRange(len, len);
    }
  });

  wrapper.appendChild(sidebar);
  wrapper.appendChild(canvas);
  container.appendChild(wrapper);
}

function bindKnowledgeWikilinks(root: HTMLElement): void {
  const activate = (el: HTMLElement) => {
    const title = el.dataset.wikiTitle?.trim();
    if (!title) return;
    const all = store.getKnowledge();
    const match =
      all.find(k => k.title.toLowerCase() === title.toLowerCase()) ||
      all.find(k => k.title.toLowerCase().includes(title.toLowerCase()));
    if (match) {
      store.selectedKnowledgeId = match.id;
      store.currentView = "knowledge";
      store.notify();
    }
  };

  root.querySelectorAll<HTMLElement>(".md-wikilink").forEach(el => {
    el.addEventListener("click", () => activate(el));
    el.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        activate(el);
      }
    });
  });
}

function createNewKnowledge(): void {
  const clientId = store.selectedClientId;
  if (!clientId) return;

  const category: KnowledgeCategory = "other";
  const newId = `KN-${String(Math.floor(100 + Math.random() * 900))}`;
  const locale = getLanguage();

  const newItem: KnowledgeItem = {
    id: newId,
    clientId,
    projectId: store.selectedProjectId || undefined,
    category,
    title: t().knowledge.untitled,
    content: knowledgeTemplate(category, locale),
    tags: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  void store.saveKnowledge(newItem);
  store.selectedKnowledgeId = newItem.id;
  store.notify();
}

function formatDate(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  return `${d.getDate()}.${d.getMonth() + 1}.`;
}

function escapeHtml(text: string): string {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}
