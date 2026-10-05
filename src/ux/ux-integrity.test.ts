/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { readSrc } from "../test/helpers";
import { CustomSelect } from "../components/custom-select";

describe("UX — progressive disclosure & select affordances", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("filter popover is fixed and elevated (not clipped by overflow row)", () => {
    const css = readSrc("styles/components/topbar.css");
    expect(css).toMatch(/\.filter-popover\s*\{[\s\S]*?position:\s*fixed/);
    expect(css).toMatch(/\.filter-popover[\s\S]*?background-color:\s*var\(--color-bg-elevated\)/);
    expect(css).toMatch(/\.filter-popover[\s\S]*?box-shadow:\s*var\(--shadow-popover\)/);
  });

  it("custom select menus portal to body so overflow parents cannot clip them", () => {
    const parent = document.createElement("div");
    parent.style.overflow = "hidden";
    parent.style.height = "20px";
    document.body.appendChild(parent);

    const select = new CustomSelect({
      options: [
        { value: "1", label: "One" },
        { value: "2", label: "Two" },
      ],
      selectedValue: "1",
      ariaLabel: "Demo",
      onChange: () => {},
    });
    parent.appendChild(select.getElement());
    select.getElement().querySelector<HTMLButtonElement>("button")!.click();

    const menu = document.body.querySelector(".custom-select-menu.is-open") as HTMLElement;
    expect(menu.parentElement).toBe(document.body);
    expect(menu.style.position).toBe("fixed");
    expect(menu.getAttribute("popover")).toBe("manual");
    expect(Number(menu.style.zIndex)).toBeGreaterThanOrEqual(1500);
  });

  it("mounts menus inside dialog hosts (above showModal top-layer content)", () => {
    const dialog = document.createElement("dialog");
    document.body.appendChild(dialog);
    dialog.showModal();

    const select = new CustomSelect({
      options: [{ value: "1", label: "One" }],
      selectedValue: "1",
      ariaLabel: "Kunde",
      onChange: () => {},
    });
    dialog.appendChild(select.getElement());
    select.getElement().querySelector<HTMLButtonElement>("button")!.click();

    expect(dialog.querySelector(".custom-select-menu.is-open")?.parentElement).toBe(dialog);
  });

  it("select trigger shows selected label for scanability", () => {
    const select = new CustomSelect({
      options: [
        { value: "", label: "Nicht zugewiesen" },
        { value: "you", label: "You" },
      ],
      selectedValue: "you",
      ariaLabel: "Zuweisung",
      onChange: () => {},
    });
    document.body.appendChild(select.getElement());
    expect(select.getElement().textContent).toContain("You");
  });

  it("changing value updates visible label without full remount", () => {
    const onChange = vi.fn();
    const select = new CustomSelect({
      options: [
        { value: "todo", label: "Zu erledigen" },
        { value: "done", label: "Erledigt" },
      ],
      selectedValue: "todo",
      ariaLabel: "Status",
      onChange,
    });
    document.body.appendChild(select.getElement());
    select.getElement().querySelector<HTMLButtonElement>("button")!.click();
    document.body.querySelector<HTMLElement>('[data-value="done"]')!.click();

    expect(onChange).toHaveBeenCalledWith("done");
    expect(select.getElement().textContent).toContain("Erledigt");
  });
});

describe("UX — form row consistency", () => {
  it("milestone control uses the same height contract as text inputs", () => {
    document.body.innerHTML = `
      <style>
        .input { min-height: 32px; padding: 8px 12px; box-sizing: border-box; display: block; }
        .milestone-switch-card {
          display: flex; align-items: center; min-height: 32px;
          padding: 8px 12px; box-sizing: border-box; width: 100%;
        }
      </style>
      <div class="form-row-2" style="display:grid; grid-template-columns:1fr 1fr; gap:16px;">
        <input class="input" value="6" />
        <label class="milestone-switch-card"><span>Als Meilenstein markieren</span><input type="checkbox" /></label>
      </div>
    `;
    const input = document.querySelector(".input") as HTMLElement;
    const milestone = document.querySelector(".milestone-switch-card") as HTMLElement;
    // happy-dom may not compute used height from CSS; assert style contracts instead
    expect(getComputedStyle(input).minHeight || input.style.minHeight).toBeTruthy();
    const inputCss = readSrc("styles/base.css");
    const dialogCss = readSrc("styles/components/dialog.css");
    const inputMin = inputCss.match(/\.input[\s\S]*?min-height:\s*([^;]+);/)?.[1];
    const mileMin = dialogCss.match(/\.milestone-switch-card[\s\S]*?min-height:\s*([^;]+);/)?.[1];
    expect(mileMin).toBe(inputMin);
    expect(milestone).toBeTruthy();
  });
});

describe("UX — error prevention copy exists for subtask Done block", () => {
  it("i18n exposes subtasksBlockDone with count placeholder", async () => {
    const { t } = await import("../i18n");
    expect(t().announcements.subtasksBlockDone).toContain("{n}");
  });
});
