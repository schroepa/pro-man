/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { CustomSelect } from "./custom-select";

describe("CustomSelect", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  function mount(selected = "b") {
    const onChange = vi.fn();
    const select = new CustomSelect({
      options: [
        { value: "a", label: "Alpha" },
        { value: "b", label: "Beta" },
        { value: "c", label: "Gamma" },
      ],
      selectedValue: selected,
      ariaLabel: "Test select",
      onChange,
    });
    document.body.appendChild(select.getElement());
    return { select, onChange };
  }

  it("renders trigger with aria-haspopup listbox", () => {
    const { select } = mount();
    const trigger = select.getElement().querySelector("button.custom-select-trigger");
    expect(trigger).toBeTruthy();
    expect(trigger?.getAttribute("aria-haspopup")).toBe("listbox");
    expect(trigger?.getAttribute("aria-expanded")).toBe("false");
    expect(trigger?.getAttribute("aria-label")).toBe("Test select");
    expect(select.getValue()).toBe("b");
  });

  it("opens portaled menu with role=listbox and options", () => {
    const { select } = mount();
    const trigger = select.getElement().querySelector<HTMLButtonElement>("button")!;
    trigger.click();

    const menu = document.body.querySelector(".custom-select-menu.is-open");
    expect(menu).toBeTruthy();
    expect(menu?.parentElement).toBe(document.body);
    expect(menu?.getAttribute("role")).toBe("listbox");
    expect(menu?.getAttribute("popover")).toBe("manual");
    expect(menu?.querySelectorAll('[role="option"]').length).toBe(3);
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
  });

  it("mounts inside an open dialog so the menu is not trapped under the top layer", () => {
    const dialog = document.createElement("dialog");
    document.body.appendChild(dialog);
    dialog.showModal();

    const onChange = vi.fn();
    const select = new CustomSelect({
      options: [
        { value: "a", label: "Alpha" },
        { value: "b", label: "Beta" },
      ],
      selectedValue: "a",
      ariaLabel: "Kunde",
      onChange,
    });
    dialog.appendChild(select.getElement());
    select.getElement().querySelector<HTMLButtonElement>("button")!.click();

    const menu = dialog.querySelector(".custom-select-menu.is-open");
    expect(menu).toBeTruthy();
    expect(menu?.parentElement).toBe(dialog);
    expect(menu?.getAttribute("popover")).toBe("manual");
  });

  it("selects option, updates value, and fires onChange", () => {
    const { select, onChange } = mount("a");
    select.getElement().querySelector<HTMLButtonElement>("button")!.click();
    const option = document.body.querySelector<HTMLElement>('[role="option"][data-value="c"]');
    option?.click();

    expect(select.getValue()).toBe("c");
    expect(onChange).toHaveBeenCalledWith("c");
    expect(document.body.querySelector(".custom-select-menu.is-open")).toBeNull();
  });

  it("closes other open selects via closeAll", () => {
    const a = mount("a").select;
    const b = mount("b").select;
    a.getElement().querySelector<HTMLButtonElement>("button")!.click();
    expect(document.body.querySelectorAll(".custom-select-menu.is-open").length).toBe(1);

    b.getElement().querySelector<HTMLButtonElement>("button")!.click();
    expect(document.body.querySelectorAll(".custom-select-menu.is-open").length).toBe(1);

    CustomSelect.closeAll();
    expect(document.body.querySelectorAll(".custom-select-menu.is-open").length).toBe(0);
  });

  it("supports keyboard open with ArrowDown", () => {
    const { select } = mount();
    const trigger = select.getElement().querySelector<HTMLButtonElement>("button")!;
    trigger.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));
    expect(document.body.querySelector(".custom-select-menu.is-open")).toBeTruthy();
  });

  it("Escape closes an open menu", () => {
    const { select } = mount();
    const trigger = select.getElement().querySelector<HTMLButtonElement>("button")!;
    trigger.click();
    trigger.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    expect(document.body.querySelector(".custom-select-menu.is-open")).toBeNull();
  });
});
