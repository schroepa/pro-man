/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, beforeEach } from "vitest";
import { MarkdownLiveField } from "./markdown-live-field";

describe("MarkdownLiveField", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("shows rendered markdown in view mode", () => {
    const field = new MarkdownLiveField({
      id: "desc",
      value: "**Hallo** Welt",
      placeholder: "Schreiben…",
    });
    document.body.append(field.getElement());
    const view = field.getElement().querySelector(".md-live-view")!;
    expect(view.innerHTML).toContain("<strong>Hallo</strong>");
    expect(view.innerHTML).toContain("Welt");
  });

  it("grows into edit mode with live preview on click", () => {
    const field = new MarkdownLiveField({
      id: "desc",
      value: "# Titel",
      placeholder: "Schreiben…",
      editHint: "Markdown",
    });
    document.body.append(field.getElement());
    field.getElement().querySelector<HTMLElement>(".md-live-view")!.click();

    const source = field.getElement().querySelector<HTMLTextAreaElement>(".md-live-source")!;
    const preview = field.getElement().querySelector<HTMLElement>(".md-live-preview")!;
    expect(source.hidden).toBe(false);
    expect(preview.hidden).toBe(false);
    expect(preview.innerHTML).toMatch(/md-h1|Titel/);

    source.value = "- [ ] Aufgabe";
    source.dispatchEvent(new Event("input"));
    expect(preview.innerHTML).toContain("md-task-item");
    expect(field.getValue()).toBe("- [ ] Aufgabe");
  });

  it("returns to rendered view on blur", async () => {
    const field = new MarkdownLiveField({
      id: "desc",
      value: "*kursiv*",
      placeholder: "Schreiben…",
    });
    document.body.append(field.getElement());
    field.focus();
    const source = field.getElement().querySelector<HTMLTextAreaElement>(".md-live-source")!;
    // Wait for enterEdit's rAF focus before blurring
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    source.blur();
    document.body.focus?.();
    await new Promise((r) => setTimeout(r, 180));
    expect(source.hidden).toBe(true);
    const view = field.getElement().querySelector(".md-live-view")!;
    expect(view.hidden).toBe(false);
    expect(view.innerHTML).toContain("<em>kursiv</em>");
  });
});
