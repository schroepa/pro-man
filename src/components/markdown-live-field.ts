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
 * Notion-like description: one surface at a time —
 * rendered Markdown when idle, auto-growing source when editing.
 */
export class MarkdownLiveField {
  private root: HTMLElement;
  private view: HTMLElement;
  private source: HTMLTextAreaElement;
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
    if (opts.labelId) this.source.setAttribute("aria-labelledby", opts.labelId);

    if (opts.editHint) {
      this.hint = document.createElement("p");
      this.hint.className = "md-live-hint";
      this.hint.textContent = opts.editHint;
    }

    this.root.append(this.view, this.source);
    if (this.hint) this.root.append(this.hint);

    this.setMode("view");
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
    if (this.mode === "edit") this.autosize();
    else this.renderView();
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

    this.source.addEventListener("input", () => this.autosize());

    this.source.addEventListener("focus", () => {
      if (this.blurTimer) {
        clearTimeout(this.blurTimer);
        this.blurTimer = null;
      }
    });

    this.source.addEventListener("blur", () => {
      this.blurTimer = setTimeout(() => {
        const active = document.activeElement;
        if (active && this.root.contains(active) && active !== this.view) return;
        this.exitEdit();
      }, 120);
    });
  }

  private enterEdit(): void {
    if (this.mode === "edit") {
      this.source.focus();
      return;
    }
    this.setMode("edit");
    requestAnimationFrame(() => {
      this.source.focus();
      const len = this.source.value.length;
      this.source.setSelectionRange(len, len);
    });
  }

  private exitEdit(): void {
    if (this.mode === "view") return;
    this.setMode("view");
  }

  private setMode(mode: "view" | "edit"): void {
    this.mode = mode;
    this.root.dataset.mode = mode;
    if (mode === "edit") {
      this.view.classList.add("is-hidden");
      this.source.classList.remove("is-hidden");
      if (this.hint) this.hint.classList.remove("is-hidden");
      this.autosize();
    } else {
      this.source.classList.add("is-hidden");
      if (this.hint) this.hint.classList.add("is-hidden");
      this.view.classList.remove("is-hidden");
      this.renderView();
    }
  }

  private autosize(): void {
    this.source.style.height = "auto";
    this.source.style.height = `${Math.max(this.minHeight, this.source.scrollHeight)}px`;
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
