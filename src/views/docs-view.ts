import { store } from "../storage/store";
import { DocItem } from "../types/doc";
import { t } from "../i18n";
import { CustomSelect } from "../components/custom-select";
import { MarkdownLiveField } from "../components/markdown-live-field";

interface DocTreeNode {
  doc: DocItem;
  depth: number;
}

function buildDocTree(docs: DocItem[]): DocTreeNode[] {
  const byId = new Map(docs.map(d => [d.id, d]));
  const children = new Map<string, DocItem[]>();
  const roots: DocItem[] = [];

  for (const doc of docs) {
    const parentId = doc.parentDocId;
    if (parentId && byId.has(parentId) && parentId !== doc.id) {
      if (!children.has(parentId)) children.set(parentId, []);
      children.get(parentId)!.push(doc);
    } else {
      roots.push(doc);
    }
  }

  const result: DocTreeNode[] = [];
  const visit = (doc: DocItem, depth: number, seen: Set<string>) => {
    if (seen.has(doc.id)) return;
    seen.add(doc.id);
    result.push({ doc, depth });
    const kids = (children.get(doc.id) || []).slice().sort((a, b) => a.title.localeCompare(b.title));
    kids.forEach(k => visit(k, depth + 1, seen));
  };

  roots.sort((a, b) => a.title.localeCompare(b.title)).forEach(r => visit(r, 0, new Set()));
  // Orphans already handled as roots; any leftover (cycles) append flat
  for (const doc of docs) {
    if (!result.some(n => n.doc.id === doc.id)) {
      result.push({ doc, depth: 0 });
    }
  }
  return result;
}

let docsListQuery = "";

export function renderDocsView(container: HTMLElement, onSelectDoc?: (docId: string) => void): void {
  container.innerHTML = "";

  const docs = store.getDocs(store.selectedClientId, store.selectedProjectId);
  const q = docsListQuery.trim().toLowerCase();
  const filtered = q
    ? docs.filter(d =>
        d.title.toLowerCase().includes(q) ||
        d.content.toLowerCase().includes(q) ||
        d.tags.some(tag => tag.toLowerCase().includes(q))
      )
    : docs;
  const tree = buildDocTree(filtered);
  const activeDocId = store.selectedDocId || (filtered.length > 0 ? filtered[0].id : null);
  const activeDoc = activeDocId ? store.getDoc(activeDocId) : null;

  const wrapper = document.createElement("div");
  wrapper.className = "docs-hub-container";
  wrapper.setAttribute("role", "region");
  wrapper.setAttribute("aria-label", t().views.docs);

  // Left: Docs List — compact titles grouped by project
  const sidebar = document.createElement("div");
  sidebar.className = "docs-list-sidebar";

  const groups = new Map<string, typeof tree>();
  for (const node of tree) {
    const key = node.doc.projectId || "__none__";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(node);
  }

  const groupHtml = [...groups.entries()].map(([projectId, nodes]) => {
    const project = projectId === "__none__" ? null : store.getProject(projectId);
    const label = project?.name || t().docs.noProject;
    return `
      <div class="docs-project-group">
        <div class="docs-project-group-label">${escapeHtml(label)}</div>
        ${nodes.map(({ doc, depth }) => {
          const isActive = doc.id === activeDocId;
          return `
            <div class="doc-card-item doc-card-compact ${isActive ? "active" : ""}" role="button" tabindex="0" data-doc-id="${doc.id}" style="padding-left: calc(var(--space-3) + ${depth * 12}px);">
              <span class="doc-card-title">${escapeHtml(doc.title || t().docs.untitled)}</span>
              <span class="doc-card-meta-date">${formatDate(doc.updatedAt)}</span>
            </div>
          `;
        }).join("")}
      </div>
    `;
  }).join("");

  sidebar.innerHTML = `
    <div class="docs-list-header">
      <span style="font-size: var(--font-size-xs); font-weight: var(--font-weight-semibold); color: var(--color-text-secondary); text-transform: uppercase;">
        ${t().views.docs} (${filtered.length})
      </span>
      <button id="add-doc-btn" class="btn btn-ghost btn-icon" title="${t().actions.newDoc}" aria-label="${t().actions.newDoc}">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>
      </button>
    </div>

    <div class="docs-list-search">
      <input type="search" id="docs-search-input" class="input" value="${escapeHtml(docsListQuery)}" placeholder="${escapeHtml(t().docs.searchPlaceholder)}" aria-label="${escapeHtml(t().docs.searchPlaceholder)}" />
    </div>

    <div class="docs-items-scroll">
      ${filtered.length === 0 ? `
        <p style="font-size: var(--font-size-xs); color: var(--color-text-muted); padding: var(--space-4); text-align: center;">
          ${t().docs.noDocs}
        </p>
      ` : groupHtml}
    </div>
  `;

  // Right: Editor Canvas
  const canvas = document.createElement("div");
  canvas.className = "doc-editor-canvas";

  if (activeDoc) {
    const clients = store.getClients();
    const projects = store.getProjects(activeDoc.clientId);
    const parentCandidates = docs.filter(d => d.id !== activeDoc.id);

    canvas.innerHTML = `
      <div class="doc-editor-header">
        <div class="doc-scope-selects" style="display: flex; gap: var(--space-2); align-items: center; flex-wrap: wrap;">
          <div id="doc-client-mount"></div>
          <div id="doc-project-mount"></div>
          <div id="doc-parent-mount"></div>
        </div>
        <button id="delete-doc-btn" class="btn btn-ghost" style="color: #ef4444; font-size: var(--font-size-xs);">
          ${t().actions.delete}
        </button>
      </div>

      <input type="text" id="doc-title-input" class="doc-title-input" value="${escapeHtml(activeDoc.title)}" placeholder="${t().docs.title}" />

      <div class="doc-metadata-bar">
        <span>${t().docs.updated}: ${new Date(activeDoc.updatedAt).toLocaleString()}</span>
        <span>•</span>
        <input type="text" id="doc-tags-input" class="input" list="doc-tags-datalist" style="width: 200px; min-height: 24px; padding: 2px 6px; font-size: 0.6875rem;" value="${activeDoc.tags.join(", ")}" placeholder="Tags (kommagetrennt)..." />
        <datalist id="doc-tags-datalist">
          ${store.getAllTags().map(tag => `<option value="${escapeHtml(tag)}"></option>`).join("")}
        </datalist>
      </div>

      <div id="doc-content-mount" class="doc-content-mount"></div>
    `;

    const titleInput = canvas.querySelector<HTMLInputElement>("#doc-title-input")!;
    const contentMount = canvas.querySelector<HTMLElement>("#doc-content-mount")!;
    const tagsInput = canvas.querySelector<HTMLInputElement>("#doc-tags-input")!;
    const deleteBtn = canvas.querySelector("#delete-doc-btn");

    const contentField = new MarkdownLiveField({
      id: "doc-content-textarea",
      value: activeDoc.content,
      placeholder: t().docs.contentPlaceholder,
      editHint: t().docs.contentMarkdownHint,
      minRows: 12,
      className: "md-live-field--docs",
      onInput: () => triggerSave(),
      onRenderView: (viewEl) => bindWikilinks(viewEl),
    });
    contentMount.appendChild(contentField.getElement());

    let selectedClientId = activeDoc.clientId;
    let selectedProjectId = activeDoc.projectId;
    let selectedParentId = activeDoc.parentDocId || "";

    const projectSelect = new CustomSelect({
      options: projects.map(p => ({ value: p.id, label: p.name, color: p.color })),
      selectedValue: activeDoc.projectId || projects[0]?.id || "",
      ariaLabel: t().filters.project,
      onChange: (val) => {
        selectedProjectId = val;
        triggerSave();
      },
    });

    const clientSelect = new CustomSelect({
      options: clients.map(c => ({ value: c.id, label: c.name, color: c.color })),
      selectedValue: activeDoc.clientId || clients[0]?.id || "",
      ariaLabel: t().filters.client,
      onChange: (val) => {
        selectedClientId = val;
        const nextProjects = store.getProjects(val);
        projectSelect.setOptions(nextProjects.map(p => ({ value: p.id, label: p.name, color: p.color })));
        selectedProjectId = nextProjects[0]?.id || "";
        projectSelect.setValue(selectedProjectId);
        triggerSave();
      },
    });

    const parentSelect = new CustomSelect({
      options: [
        { value: "", label: t().docs.noParent },
        ...parentCandidates.map(d => ({ value: d.id, label: d.title || d.id })),
      ],
      selectedValue: activeDoc.parentDocId || "",
      ariaLabel: t().docs.parentDoc,
      onChange: (val) => {
        selectedParentId = val;
        triggerSave();
      },
    });

    canvas.querySelector("#doc-client-mount")?.appendChild(clientSelect.getElement());
    canvas.querySelector("#doc-project-mount")?.appendChild(projectSelect.getElement());
    canvas.querySelector("#doc-parent-mount")?.appendChild(parentSelect.getElement());

    let saveTimeout: ReturnType<typeof setTimeout> | null = null;
    const triggerSave = () => {
      if (saveTimeout) clearTimeout(saveTimeout);
      saveTimeout = setTimeout(() => {
        const updated: DocItem = {
          ...activeDoc,
          title: titleInput.value.trim() || t().docs.untitled,
          content: contentField.getValue(),
          clientId: selectedClientId,
          projectId: selectedProjectId,
          parentDocId: selectedParentId || undefined,
          tags: tagsInput.value.split(",").map(s => s.trim()).filter(Boolean),
          updatedAt: new Date().toISOString(),
        };
        store.saveDoc(updated);
      }, 400);
    };

    titleInput.addEventListener("input", triggerSave);
    tagsInput.addEventListener("input", triggerSave);

    deleteBtn?.addEventListener("click", async () => {
      if (confirm(`Dokument "${activeDoc.title}" wirklich löschen?`)) {
        await store.deleteDoc(activeDoc.id);
        store.selectedDocId = null;
        store.notify();
      }
    });
  } else {
    canvas.innerHTML = `
      <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; color: var(--color-text-muted); gap: var(--space-3);">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
        <p style="font-size: var(--font-size-sm);">${t().docs.selectToView}</p>
        <button id="empty-add-doc-btn" class="btn btn-primary">${t().actions.newDoc}</button>
      </div>
    `;

    canvas.querySelector("#empty-add-doc-btn")?.addEventListener("click", () => {
      createNewDoc();
    });
  }

  const selectDoc = (docId: string) => {
    store.selectedDocId = docId;
    onSelectDoc?.(docId);
    store.notify();
  };

  sidebar.addEventListener("click", (e) => {
    const target = e.target as HTMLElement;
    const card = target.closest<HTMLElement>(".doc-card-item");
    if (card?.dataset.docId) {
      selectDoc(card.dataset.docId);
    }
  });

  sidebar.addEventListener("keydown", (e) => {
    const ke = e as KeyboardEvent;
    if (ke.key !== "Enter" && ke.key !== " ") return;
    const target = ke.target as HTMLElement;
    const card = target.closest<HTMLElement>(".doc-card-item");
    if (card && target === card && card.dataset.docId) {
      ke.preventDefault();
      selectDoc(card.dataset.docId);
    }
  });

  sidebar.querySelector("#add-doc-btn")?.addEventListener("click", () => {
    createNewDoc();
  });

  const searchInput = sidebar.querySelector<HTMLInputElement>("#docs-search-input");
  searchInput?.addEventListener("input", () => {
    docsListQuery = searchInput.value;
    renderDocsView(container, onSelectDoc);
    const again = container.querySelector<HTMLInputElement>("#docs-search-input");
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

function bindWikilinks(root: HTMLElement): void {
  const activate = (el: HTMLElement) => {
    const title = el.dataset.wikiTitle?.trim();
    if (!title) return;
    const match = store.getDocs().find(d => d.title.toLowerCase() === title.toLowerCase())
      || store.getDocs().find(d => d.title.toLowerCase().includes(title.toLowerCase()));
    if (match) {
      store.selectedDocId = match.id;
      store.currentView = "docs";
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

function createNewDoc(): void {
  const newId = `DOC-${String(Math.floor(100 + Math.random() * 900))}`;
  const clients = store.getClients();
  const defaultClient = store.selectedClientId || (clients.length > 0 ? clients[0].id : "cli-internal");
  const projects = store.getProjects(defaultClient);
  const defaultProject = store.selectedProjectId || (projects.length > 0 ? projects[0].id : "prj-core-dev");

  const newDoc: DocItem = {
    id: newId,
    clientId: defaultClient,
    projectId: defaultProject,
    title: t().docs.untitled,
    content: "",
    tags: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  store.saveDoc(newDoc);
  store.selectedDocId = newDoc.id;
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
