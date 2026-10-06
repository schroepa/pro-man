/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { fuzzyScore, bestFuzzyScore } from "../utils/fuzzy-match";
import {
  clearCommandRecents,
  getCommandRecents,
  pushCommandRecent,
} from "../storage/command-recents";
import { CommandPalette } from "../components/command-palette";
import { makeTask, resetStoreMaps, seedClientProject, storeInternals } from "../test/helpers";
import { t } from "../i18n";

describe("fuzzyScore", () => {
  it("scores exact and prefix higher than subsequence", () => {
    expect(fuzzyScore("acm", "ACM-WEB-1")).toBeGreaterThan(fuzzyScore("acm", "xacmx"));
    expect(fuzzyScore("web", "Web Portal Header")).toBeGreaterThan(0);
    expect(fuzzyScore("zzz", "Web Portal")).toBe(0);
  });

  it("matches across fields via bestFuzzyScore", () => {
    expect(bestFuzzyScore("portal", ["ACM-1", "Other", "Web Portal"])).toBeGreaterThan(0);
    expect(bestFuzzyScore("acm-web", ["ACM-WEB-2", "title"])).toBeGreaterThan(
      bestFuzzyScore("acm-web", ["unrelated"])
    );
  });
});

describe("command recents", () => {
  beforeEach(() => {
    clearCommandRecents();
  });

  it("keeps newest first and caps at 8", () => {
    for (let i = 0; i < 10; i++) {
      pushCommandRecent({ kind: "task", id: `T-${i}` });
    }
    const recents = getCommandRecents();
    expect(recents).toHaveLength(8);
    expect(recents[0].id).toBe("T-9");
    expect(recents[7].id).toBe("T-2");
  });

  it("moves reselected item to front", () => {
    pushCommandRecent({ kind: "task", id: "A" });
    pushCommandRecent({ kind: "task", id: "B" });
    pushCommandRecent({ kind: "task", id: "A" });
    expect(getCommandRecents().map(r => r.id)).toEqual(["A", "B"]);
  });
});

describe("CommandPalette search UX", () => {
  beforeEach(() => {
    resetStoreMaps();
    clearCommandRecents();
    document.body.innerHTML = "";
    const { clientId, projectId } = seedClientProject();
    storeInternals().tasks.set(
      "TASK-1",
      makeTask({
        id: "TASK-1",
        issueKey: "ACM-WEB-9",
        title: "Portal Header Layout",
        tags: ["portal", "ui"],
        clientId,
        projectId,
      })
    );
  });

  it("empty query shows Recent / Actions / Views groups, not all tasks", () => {
    pushCommandRecent({ kind: "task", id: "TASK-1" });
    const palette = new CommandPalette(() => {}, () => {});
    palette.open();
    const text = document.querySelector(".command-results-list")!.textContent || "";
    expect(text).toContain(t().command.groupRecent);
    expect(text).toContain(t().command.groupActions);
    expect(text).toContain(t().command.groupViews);
    expect(text).not.toContain(t().command.groupTasks);
    palette.close();
  });

  it("query fuzzy-matches issue key and groups Tasks", () => {
    const palette = new CommandPalette(() => {}, () => {});
    palette.open();
    const input = document.querySelector<HTMLInputElement>(".command-search-input")!;
    input.value = "acm-web";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    const text = document.querySelector(".command-results-list")!.textContent || "";
    expect(text).toContain(t().command.groupTasks);
    expect(text).toContain("ACM-WEB-9");
    expect(text).toContain("Portal Header Layout");
    palette.close();
  });

  it("Home/End move selection and scroll focused option", () => {
    const palette = new CommandPalette(() => {}, () => {});
    palette.open("board");
    const input = document.querySelector<HTMLInputElement>(".command-search-input")!;
    const options = () => document.querySelectorAll(".command-item");
    expect(options().length).toBeGreaterThan(1);

    input.dispatchEvent(new KeyboardEvent("keydown", { key: "End", bubbles: true }));
    const last = document.querySelector(".command-item.focused");
    expect(last?.id).toMatch(/command-option-\d+/);
    expect(last?.getAttribute("aria-selected")).toBe("true");

    input.dispatchEvent(new KeyboardEvent("keydown", { key: "Home", bubbles: true }));
    expect(document.querySelector("#command-option-0")?.classList.contains("focused")).toBe(true);
    palette.close();
  });

  it("selecting a task records a recent", () => {
    const onOpen = vi.fn();
    const palette = new CommandPalette(() => {}, () => {}, onOpen);
    palette.open("portal");
    const item = Array.from(document.querySelectorAll(".command-item")).find(el =>
      (el.textContent || "").includes("Portal Header")
    ) as HTMLElement;
    expect(item).toBeTruthy();
    item.click();
    expect(onOpen).toHaveBeenCalledWith("TASK-1");
    expect(getCommandRecents()[0]).toEqual({ kind: "task", id: "TASK-1" });
  });
});
