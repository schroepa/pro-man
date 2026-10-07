/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, beforeEach } from "vitest";
import { MarkdownLiveField } from "./markdown-live-field";

describe("MarkdownLiveField", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("shows only rendered markdown in view mode", () => {
    const field = new MarkdownLiveField({
      id: "desc",
      value: "**Hallo** Welt",
      placeholder: "Schreiben…",
    });
    document.body.append(field.getElement());
    const view = field.getElement().querySelector(".md-live-view")!;
    const source = field.getElement().querySelector(".md-live-source")!;
    expect(view.classList.contains("is-hidden")).toBe(false);
    expect(source.classList.contains("is-hidden")).toBe(true);
    expect(view.innerHTML).toContain("<strong>Hallo</strong>");
    expect(field.getElement().querySelector(".md-live-preview")).toBeNull();
  });

  it("switches to a single auto-growing editor on click", () => {
    const field = new MarkdownLiveField({
      id: "desc",
      value: "# Titel",
      placeholder: "Schreiben…",
      editHint: "Markdown",
    });
    document.body.append(field.getElement());
    field.getElement().querySelector<HTMLElement>(".md-live-view")!.click();

    const view = field.getElement().querySelector(".md-live-view")!;
    const source = field.getElement().querySelector<HTMLTextAreaElement>(".md-live-source")!;
    expect(view.classList.contains("is-hidden")).toBe(true);
    expect(source.classList.contains("is-hidden")).toBe(false);
    expect(source.value).toBe("# Titel");

    source.value = "- [ ] Aufgabe\n- [ ] Zwei";
    source.dispatchEvent(new Event("input"));
    expect(Number.parseInt(source.style.height || "0", 10)).toBeGreaterThan(40);
    expect(field.getValue()).toBe("- [ ] Aufgabe\n- [ ] Zwei");
  });

  it("returns to a single rendered view on blur", async () => {
    const field = new MarkdownLiveField({
      id: "desc",
      value: "*kursiv*",
      placeholder: "Schreiben…",
    });
    document.body.append(field.getElement());
    field.focus();
    const source = field.getElement().querySelector<HTMLTextAreaElement>(".md-live-source")!;
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    source.blur();
    document.body.focus?.();
    await new Promise((r) => setTimeout(r, 180));

    expect(source.classList.contains("is-hidden")).toBe(true);
    const view = field.getElement().querySelector(".md-live-view")!;
    expect(view.classList.contains("is-hidden")).toBe(false);
    expect(view.innerHTML).toContain("<em>kursiv</em>");
  });
});
