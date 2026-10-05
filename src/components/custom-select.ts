export interface SelectOption {
  value: string;
  label: string;
  color?: string;
  iconSvg?: string;
  badge?: string;
}

export interface CustomSelectProps {
  id?: string;
  prefixLabel?: string;
  options: SelectOption[];
  selectedValue: string;
  onChange: (value: string) => void;
  ariaLabel?: string;
}

const OPEN_SELECTS = new Set<CustomSelect>();

export class CustomSelect {
  private element: HTMLElement;
  private triggerBtn: HTMLButtonElement;
  private menu: HTMLElement;
  private options: SelectOption[];
  private selectedValue: string;
  private prefixLabel?: string;
  private onChange: (value: string) => void;
  private isOpen = false;
  private focusedIndex = -1;
  private onReposition = (): void => this.positionMenu();
  private onDocClick = (e: MouseEvent): void => {
    const target = e.target as Node;
    if (!this.element.contains(target) && !this.menu.contains(target)) {
      this.close();
    }
  };

  constructor(props: CustomSelectProps) {
    this.options = props.options;
    this.selectedValue = props.selectedValue;
    this.prefixLabel = props.prefixLabel;
    this.onChange = props.onChange;

    this.element = document.createElement("div");
    this.element.className = "custom-select";
    if (props.id) this.element.id = props.id;

    this.triggerBtn = document.createElement("button");
    this.triggerBtn.type = "button";
    this.triggerBtn.className = "custom-select-trigger";
    this.triggerBtn.setAttribute("aria-haspopup", "listbox");
    this.triggerBtn.setAttribute("aria-expanded", "false");
    if (props.ariaLabel) this.triggerBtn.setAttribute("aria-label", props.ariaLabel);

    this.menu = document.createElement("div");
    this.menu.className = "custom-select-menu";
    this.menu.setAttribute("role", "listbox");
    if (props.ariaLabel) this.menu.setAttribute("aria-label", props.ariaLabel);
    // Top-layer popover so menus paint above <dialog showModal()> (z-index alone cannot)
    this.menu.setAttribute("popover", "manual");

    this.element.appendChild(this.triggerBtn);
    this.element.appendChild(this.menu);

    this.render();
    this.bindEvents();
  }

  public getElement(): HTMLElement {
    return this.element;
  }

  public getValue(): string {
    return this.selectedValue;
  }

  public setValue(val: string): void {
    this.selectedValue = val;
    this.render();
  }

  public setOptions(newOptions: SelectOption[]): void {
    this.options = newOptions;
    this.render();
  }

  public static closeAll(): void {
    [...OPEN_SELECTS].forEach(sel => sel.close());
  }

  private render(): void {
    const current = this.options.find(o => o.value === this.selectedValue) || this.options[0];
    const displayLabel = current ? current.label : "Auswählen...";

    this.triggerBtn.innerHTML = `
      <span class="custom-select-label">
        ${current && current.iconSvg ? `<span class="option-icon" aria-hidden="true">${current.iconSvg}</span>` : (current && current.color ? `<span class="option-dot" style="background-color: ${current.color};" aria-hidden="true"></span>` : "")}
        <span>${this.prefixLabel ? `<span style="color: var(--color-text-muted);">${escapeHtml(this.prefixLabel)}: </span>` : ""}${escapeHtml(displayLabel)}</span>
      </span>
      <svg class="custom-select-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true">
        <path d="M6 9l6 6 6-6"/>
      </svg>
    `;

    this.menu.innerHTML = "";
    this.options.forEach((opt, idx) => {
      const isSelected = opt.value === this.selectedValue;
      const optEl = document.createElement("div");
      optEl.className = `custom-select-option ${isSelected ? "selected" : ""}`;
      optEl.setAttribute("role", "option");
      optEl.setAttribute("aria-selected", String(isSelected));
      optEl.dataset.value = opt.value;
      optEl.dataset.index = String(idx);

      optEl.innerHTML = `
        <div class="option-left">
          ${opt.iconSvg ? `<span class="option-icon" aria-hidden="true">${opt.iconSvg}</span>` : (opt.color ? `<span class="option-dot" style="background-color: ${opt.color};" aria-hidden="true"></span>` : "")}
          <span>${escapeHtml(opt.label)}</span>
        </div>
        ${isSelected ? `
          <svg class="option-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        ` : ""}
      `;

      optEl.addEventListener("click", (e) => {
        e.stopPropagation();
        this.selectOption(opt.value);
      });

      this.menu.appendChild(optEl);
    });
  }

  private bindEvents(): void {
    this.triggerBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      this.toggle();
    });

    this.triggerBtn.addEventListener("keydown", (e) => {
      if (e.key === "ArrowDown" || e.key === " ") {
        e.preventDefault();
        if (!this.isOpen) {
          this.open();
        } else {
          this.focusNextOption();
        }
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (!this.isOpen) {
          this.open();
        } else if (this.focusedIndex >= 0 && this.options[this.focusedIndex]) {
          this.selectOption(this.options[this.focusedIndex].value);
        }
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        if (this.isOpen) {
          this.focusPrevOption();
        }
      } else if (e.key === "Escape" && this.isOpen) {
        e.preventDefault();
        this.close();
      }
    });
  }

  private toggle(): void {
    if (this.isOpen) this.close();
    else this.open();
  }

  private open(): void {
    // Close other open selects cleanly (incl. portaled menus)
    OPEN_SELECTS.forEach(sel => {
      if (sel !== this) sel.close();
    });

    this.isOpen = true;
    OPEN_SELECTS.add(this);
    this.element.classList.add("open");
    this.triggerBtn.setAttribute("aria-expanded", "true");

    this.mountMenu();
    this.menu.classList.add("is-open");
    this.showMenuInTopLayer();
    this.positionMenu();

    this.focusedIndex = this.options.findIndex(o => o.value === this.selectedValue);
    if (this.focusedIndex === -1) this.focusedIndex = 0;
    this.highlightFocused();

    window.addEventListener("resize", this.onReposition);
    window.addEventListener("scroll", this.onReposition, true);
    setTimeout(() => document.addEventListener("click", this.onDocClick), 0);
  }

  private close(): void {
    if (!this.isOpen) return;
    this.isOpen = false;
    OPEN_SELECTS.delete(this);
    this.element.classList.remove("open");
    this.triggerBtn.setAttribute("aria-expanded", "false");
    this.menu.classList.remove("is-open");
    this.hideMenuFromTopLayer();
    this.clearHighlight();

    window.removeEventListener("resize", this.onReposition);
    window.removeEventListener("scroll", this.onReposition, true);
    document.removeEventListener("click", this.onDocClick);

    // Return menu to component root for clean teardown on re-render
    if (this.menu.parentElement !== this.element) {
      this.element.appendChild(this.menu);
    }
  }

  /** Prefer open dialog as host; otherwise body (overflow-safe). */
  private mountMenu(): void {
    const dialog = this.element.closest("dialog");
    const root = dialog ?? document.body;
    if (this.menu.parentElement !== root) {
      root.appendChild(this.menu);
    }
  }

  private showMenuInTopLayer(): void {
    const menu = this.menu as HTMLElement & { showPopover?: () => void };
    if (typeof menu.showPopover !== "function") return;
    try {
      if (!this.menu.matches(":popover-open")) menu.showPopover();
    } catch {
      // Already open or unsupported in this context
    }
  }

  private hideMenuFromTopLayer(): void {
    const menu = this.menu as HTMLElement & { hidePopover?: () => void };
    if (typeof menu.hidePopover !== "function") return;
    try {
      if (this.menu.matches(":popover-open")) menu.hidePopover();
    } catch {
      // Already closed
    }
  }

  private positionMenu(): void {
    if (!this.isOpen) return;
    const rect = this.triggerBtn.getBoundingClientRect();
    const pad = 8;
    const menuWidth = Math.max(rect.width, 210);
    const maxWidth = Math.min(320, window.innerWidth - pad * 2);
    const width = Math.min(Math.max(menuWidth, 210), maxWidth);

    let left = rect.left;
    if (left + width > window.innerWidth - pad) {
      left = Math.max(pad, window.innerWidth - pad - width);
    }

    const spaceBelow = window.innerHeight - rect.bottom - pad;
    const spaceAbove = rect.top - pad;
    const preferBelow = spaceBelow >= 160 || spaceBelow >= spaceAbove;
    const maxHeight = Math.min(280, preferBelow ? spaceBelow : spaceAbove);

    this.menu.style.position = "fixed";
    this.menu.style.inset = "auto";
    this.menu.style.margin = "0";
    this.menu.style.left = `${Math.round(left)}px`;
    this.menu.style.width = `${Math.round(width)}px`;
    this.menu.style.minWidth = `${Math.round(width)}px`;
    this.menu.style.maxHeight = `${Math.max(120, Math.round(maxHeight))}px`;
    this.menu.style.zIndex = "1500";

    if (preferBelow) {
      this.menu.style.top = `${Math.round(rect.bottom + 4)}px`;
      this.menu.style.bottom = "auto";
    } else {
      this.menu.style.top = "auto";
      this.menu.style.bottom = `${Math.round(window.innerHeight - rect.top + 4)}px`;
    }
  }

  private selectOption(val: string): void {
    this.selectedValue = val;
    this.render();
    this.close();
    this.onChange(val);
  }

  private focusNextOption(): void {
    this.focusedIndex = (this.focusedIndex + 1) % this.options.length;
    this.highlightFocused();
  }

  private focusPrevOption(): void {
    this.focusedIndex = (this.focusedIndex - 1 + this.options.length) % this.options.length;
    this.highlightFocused();
  }

  private highlightFocused(): void {
    const items = this.menu.querySelectorAll(".custom-select-option");
    items.forEach((item, idx) => {
      if (idx === this.focusedIndex) {
        item.classList.add("focused");
        item.scrollIntoView({ block: "nearest" });
      } else {
        item.classList.remove("focused");
      }
    });
  }

  private clearHighlight(): void {
    this.menu.querySelectorAll(".custom-select-option.focused").forEach(i => i.classList.remove("focused"));
  }
}

function escapeHtml(text: string): string {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}
