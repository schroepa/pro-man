/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, beforeEach } from "vitest";
import axe from "axe-core";
import { CustomSelect } from "../components/custom-select";
import { announcer } from "./announcer";
import { showToast } from "../components/toast";

async function runAxe(root: Element | Document = document): Promise<axe.AxeResults> {
  return axe.run(root, {
    rules: {
      // happy-dom document lacks full page chrome; focus on component rules
      "html-has-lang": { enabled: false },
      "landmark-one-main": { enabled: false },
      "page-has-heading-one": { enabled: false },
      region: { enabled: false },
    },
  });
}

describe("accessibility — live announcer", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("creates polite live region when missing", () => {
    announcer.announce("Aufgabe gespeichert");
    const el = document.getElementById("live-announcer");
    expect(el).toBeTruthy();
    expect(el?.getAttribute("aria-live")).toBe("polite");
    expect(el?.getAttribute("aria-atomic")).toBe("true");
    expect(el?.classList.contains("sr-only")).toBe(true);
  });

  it("can switch to assertive announcements", () => {
    announcer.announce("Kritischer Fehler", true);
    expect(document.getElementById("live-announcer")?.getAttribute("aria-live")).toBe("assertive");
  });
});

describe("accessibility — toast roles", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("info toasts use status; errors use alert", () => {
    showToast("Info", "info", 60_000);
    showToast("Boom", "error", 60_000);
    const toasts = document.querySelectorAll(".toast");
    expect(toasts.length).toBe(2);
    expect(document.querySelector(".toast-info")?.getAttribute("role")).toBe("status");
    expect(document.querySelector(".toast-error")?.getAttribute("role")).toBe("alert");
    expect(document.querySelector(".toast-container")?.getAttribute("aria-live")).toBe("polite");
  });
});

describe("accessibility — CustomSelect axe", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    document.documentElement.lang = "de";
  });

  it("closed select has no serious/critical axe violations", async () => {
    const select = new CustomSelect({
      options: [
        { value: "", label: "Nicht zugewiesen" },
        { value: "you", label: "You" },
        { value: "opt", label: "Optional" },
      ],
      selectedValue: "you",
      ariaLabel: "Zuweisung",
      onChange: () => {},
    });
    document.body.appendChild(select.getElement());

    const results = await runAxe(select.getElement());
    const serious = results.violations.filter(v => v.impact === "serious" || v.impact === "critical");
    expect(serious, JSON.stringify(serious, null, 2)).toEqual([]);
  });

  it("open listbox exposes selected option via aria-selected", () => {
    const select = new CustomSelect({
      options: [
        { value: "a", label: "Alpha" },
        { value: "b", label: "Beta" },
      ],
      selectedValue: "b",
      ariaLabel: "Status",
      onChange: () => {},
    });
    document.body.appendChild(select.getElement());
    select.getElement().querySelector<HTMLButtonElement>("button")!.click();

    const selected = document.body.querySelector('[role="option"][aria-selected="true"]');
    expect(selected?.getAttribute("data-value")).toBe("b");
  });
});

describe("accessibility — dialog surface landmarks", () => {
  it("task dialog markup uses labelled dialog pattern", async () => {
    // Lightweight structural fixture mirroring TaskDialog chrome
    document.body.innerHTML = `
      <dialog class="task-dialog" open aria-labelledby="dialog-heading">
        <form method="dialog">
          <h2 id="dialog-heading">Aufgabe bearbeiten</h2>
          <label for="title">Titel</label>
          <input id="title" class="input" value="Demo" />
          <button type="submit">Speichern</button>
        </form>
      </dialog>
    `;
    const results = await runAxe(document.querySelector("dialog")!);
    const serious = results.violations.filter(v => v.impact === "serious" || v.impact === "critical");
    expect(serious, JSON.stringify(serious, null, 2)).toEqual([]);
  });
});
