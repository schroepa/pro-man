import { store } from "../storage/store";
import { DocItem } from "../types/doc";
import { t } from "../i18n";
import { renderMarkdown } from "../utils/markdown";
import { CustomSelect } from "../components/custom-select";

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

export function renderDocsView(container: HTMLElement, onSelectDoc?: (docId: string) => void): void {
  container.innerHTML = "";

  const docs = store.getDocs(store.selectedClientId, store.selectedProjectId);
  const tree = buildDocTree(docs);
  const activeDocId = store.selectedDocId || (docs.length > 0 ? docs[0].id : null);
  const activeDoc = activeDocId ? store.getDoc(activeDocId) : null;

  const wrapper = document.createElement("div");
  wrapper.className = "docs-hub-container";
  wrapper.setAttribute("role", "region");
  wrapper.setAttribute("aria-label", t().views.docs);

  // Left: Docs List
  const sidebar = document.createElement("div");
  sidebar.className = "docs-list-sidebar";

  sidebar.innerHTML = `
    <div class="docs-list-header">
      <span style="font-size: var(--font-size-xs); font-weight: var(--font-weight-semibold); color: var(--color-text-secondary); text-transform: uppercase;">
        ${t().views.docs} (${docs.length})
      </span>
      <button id="add-doc-btn" class="btn btn-ghost btn-icon" title="${t().actions.newDoc}" aria-label="${t().actions.newDoc}">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>
      </button>
    </div>

    <div class="docs-items-scroll">
      ${docs.length === 0 ? `
        <p style="font-size: var(--font-size-xs); color: var(--color-text-muted); padding: var(--space-4); text-align: center;">
          ${t().docs.noDocs}
        </p>
      ` : tree.map(({ doc, depth }) => {
        const isActive = doc.id === activeDocId;
        const client = store.getClient(doc.clientId);
        return `
          <div class="doc-card-item ${isActive ? "active" : ""}" role="button" tabindex="0" data-doc-id="${doc.id}" style="padding-left: calc(var(--space-3) + ${depth * 14}px);">
            <span class="doc-card-title">${escapeHtml(doc.title || "Unbenanntes Dokument")}</span>
            <span class="doc-card-snippet">${escapeHtml(doc.content.replace(/^#+ /gm, ""))}</span>
            <div class="doc-card-meta">
              <span>${client ? escapeHtml(client.name) : ""}</span>
              <span>${formatDate(doc.updatedAt)}</span>
            </div>
          </div>
        `;
      }).join("")}
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

      <div class="markdown-editor-wrapper">
        <div class="markdown-tab-bar">
          <div class="md-tab-group" role="tablist" aria-label="Editor-Modus">
            <button type="button" class="md-tab-btn active" data-mode="edit" role="tab" aria-selected="true">Bearbeiten</button>
            <button type="button" class="md-tab-btn" data-mode="preview" role="tab" aria-selected="false">Vorschau</button>
          </div>
        </div>
        <textarea id="doc-content-textarea" class="doc-content-textarea" placeholder="${t().docs.contentPlaceholder}">${escapeHtml(activeDoc.content)}</textarea>
        <div id="doc-preview-pane" class="markdown-preview-pane doc-preview-pane" hidden></div>
      </div>
    `;

    const titleInput = canvas.querySelector<HTMLInputElement>("#doc-title-input")!;
    const contentTextarea = canvas.querySelector<HTMLTextAreaElement>("#doc-content-textarea")!;
    const previewPane = canvas.querySelector<HTMLElement>("#doc-preview-pane")!;
    const tagsInput = canvas.querySelector<HTMLInputElement>("#doc-tags-input")!;
    const deleteBtn = canvas.querySelector("#delete-doc-btn");

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

    let saveTimeout: any = null;
    const triggerSave = () => {
      clearTimeout(saveTimeout);
      saveTimeout = setTimeout(() => {
        const updated: DocItem = {
          ...activeDoc,
          title: titleInput.value.trim() || "Unbenannt",
          content: contentTextarea.value,
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
    contentTextarea.addEventListener("input", () => {
      triggerSave();
      if (!previewPane.hidden) {
        renderPreview(previewPane, contentTextarea.value);
      }
    });
    tagsInput.addEventListener("input", triggerSave);

    canvas.querySelectorAll<HTMLButtonElement>(".md-tab-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const mode = btn.dataset.mode;
        canvas.querySelectorAll<HTMLButtonElement>(".md-tab-btn").forEach(b => {
          const active = b === btn;
          b.classList.toggle("active", active);
          b.setAttribute("aria-selected", String(active));
        });
        if (mode === "preview") {
          contentTextarea.hidden = true;
          previewPane.hidden = false;
          renderPreview(previewPane, contentTextarea.value);
        } else {
          contentTextarea.hidden = false;
          previewPane.hidden = true;
        }
      });
    });

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

  wrapper.appendChild(sidebar);
  wrapper.appendChild(canvas);
  container.appendChild(wrapper);
}

function renderPreview(previewPane: HTMLElement, markdown: string): void {
  previewPane.innerHTML = renderMarkdown(markdown);
  bindWikilinks(previewPane);
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
    title: "Neues Dokument",
    content: "# Neues Dokument\n\nBeginne hier mit deinen Notizen...",
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
