import { renderMarkdown } from "../utils/markdown";

export interface MarkdownLiveFieldOptions {
  id: string;
  labelId?: string;
  value: string;
  placeholder: string;
  editHint?: string;
  minRows?: number;
}

/**
 * Notion-like description field: click to edit (auto-growing textarea),
 * live Markdown preview while typing, rendered view when idle.
 */
export class MarkdownLiveField {
  private root: HTMLElement;
  private view: HTMLElement;
  private source: HTMLTextAreaElement;
  private livePreview: HTMLElement;
  private hint: HTMLElement | null = null;
  private placeholder: string;
  private minHeight: number;
  private mode: "view" | "edit" = "view";
  private blurTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(opts: MarkdownLiveFieldOptions) {
    this.placeholder = opts.placeholder;
    this.minHeight = (opts.minRows ?? 3) * 22;

    this.root = document.createElement("div");
    this.root.className = "md-live-field";
    this.root.dataset.mode = "view";

    this.view = document.createElement("div");
    this.view.className = "md-live-view";
    this.view.tabIndex = 0;
    this.view.setAttribute("role", "button");
    this.view.setAttribute("aria-label", opts.placeholder);

    this.source = document.createElement("textarea");
    this.source.id = opts.id;
    this.source.className = "textarea md-live-source";
    this.source.value = opts.value || "";
    this.source.placeholder = opts.placeholder;
    this.source.rows = opts.minRows ?? 3;
    this.source.hidden = true;
    if (opts.labelId) this.source.setAttribute("aria-labelledby", opts.labelId);

    this.livePreview = document.createElement("div");
    this.livePreview.className = "md-live-preview markdown-preview-pane";
    this.livePreview.hidden = true;
    this.livePreview.setAttribute("aria-live", "polite");

    if (opts.editHint) {
      this.hint = document.createElement("p");
      this.hint.className = "md-live-hint";
      this.hint.textContent = opts.editHint;
      this.hint.hidden = true;
    }

    this.root.append(this.view, this.source, this.livePreview);
    if (this.hint) this.root.append(this.hint);

    this.renderView();
    this.bind();
  }

  getElement(): HTMLElement {
    return this.root;
  }

  getValue(): string {
    return this.source.value;
  }

  setValue(value: string): void {
    this.source.value = value;
    if (this.mode === "edit") {
      this.autosize();
      this.updateLivePreview();
    } else {
      this.renderView();
    }
  }

  focus(): void {
    this.enterEdit();
  }

  private bind(): void {
    this.view.addEventListener("click", () => this.enterEdit());
    this.view.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        this.enterEdit();
      }
    });

    this.source.addEventListener("input", () => {
      this.autosize();
      this.updateLivePreview();
    });

    this.source.addEventListener("focus", () => {
      if (this.blurTimer) {
        clearTimeout(this.blurTimer);
        this.blurTimer = null;
      }
    });

    this.source.addEventListener("blur", () => {
      // Allow clicking inside the field (preview) without collapsing mid-interaction
      this.blurTimer = setTimeout(() => {
        const active = document.activeElement;
        if (active && this.root.contains(active) && active !== this.view) return;
        this.exitEdit();
      }, 120);
    });

    this.livePreview.addEventListener("mousedown", (e) => {
      // Keep focus on textarea when interacting with preview chrome
      e.preventDefault();
      this.source.focus();
    });
  }

  private enterEdit(): void {
    if (this.mode === "edit") {
      this.source.focus();
      return;
    }
    this.mode = "edit";
    this.root.dataset.mode = "edit";
    this.view.hidden = true;
    this.source.hidden = false;
    this.livePreview.hidden = false;
    if (this.hint) this.hint.hidden = false;
    this.autosize();
    this.updateLivePreview();
    requestAnimationFrame(() => {
      this.source.focus();
      const len = this.source.value.length;
      this.source.setSelectionRange(len, len);
    });
  }

  private exitEdit(): void {
    if (this.mode === "view") return;
    this.mode = "view";
    this.root.dataset.mode = "view";
    this.source.hidden = true;
    this.livePreview.hidden = true;
    if (this.hint) this.hint.hidden = true;
    this.view.hidden = false;
    this.renderView();
  }

  private autosize(): void {
    this.source.style.height = "auto";
    this.source.style.height = `${Math.max(this.minHeight, this.source.scrollHeight)}px`;
  }

  private updateLivePreview(): void {
    const raw = this.source.value.trim();
    if (!raw) {
      this.livePreview.innerHTML = `<p class="md-live-empty">${escapeHtml(this.placeholder)}</p>`;
      this.livePreview.classList.add("is-empty");
      return;
    }
    this.livePreview.classList.remove("is-empty");
    this.livePreview.innerHTML = renderMarkdown(raw);
  }

  private renderView(): void {
    const raw = this.source.value.trim();
    if (!raw) {
      this.view.classList.add("is-empty");
      this.view.innerHTML = `<p class="md-live-empty">${escapeHtml(this.placeholder)}</p>`;
      return;
    }
    this.view.classList.remove("is-empty");
    this.view.innerHTML = renderMarkdown(raw);
  }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
