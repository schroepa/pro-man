/**
 * Accessible Live Announcer for Screen Readers (WCAG 4.1.3 Status Messages)
 */
class LiveAnnouncer {
  private element: HTMLElement | null = null;

  init(): void {
    if (this.element && document.contains(this.element)) return;
    this.element = document.getElementById("live-announcer");
    if (!this.element) {
      this.element = document.createElement("div");
      this.element.id = "live-announcer";
      this.element.setAttribute("aria-live", "polite");
      this.element.setAttribute("aria-atomic", "true");
      this.element.className = "sr-only";
      document.body.appendChild(this.element);
    }
  }

  announce(message: string, assertive = false): void {
    this.init();
    if (!this.element) return;

    if (assertive) {
      this.element.setAttribute("aria-live", "assertive");
    } else {
      this.element.setAttribute("aria-live", "polite");
    }

    // Clear and set after slight delay to ensure screen readers pick up change
    this.element.textContent = "";
    setTimeout(() => {
      if (this.element) {
        this.element.textContent = message;
      }
    }, 50);
  }
}

export const announcer = new LiveAnnouncer();
