import { describe, it, expect } from "vitest";
import type { Client, Project } from "../types/client";
import type { DocItem } from "../types/doc";
import { makeTask } from "../test/helpers";
import {
  computeVaultHealth,
  extractWikilinks,
  lintVaultData,
  renderHealthMarkdown,
} from "./vault-health";

const clients: Client[] = [
  { id: "cli-acme", name: "Acme", color: "#000", code: "ACM" },
];
const projects: Project[] = [
  { id: "prj-web", clientId: "cli-acme", name: "Web", color: "#000", code: "WEB" },
];
const docs: DocItem[] = [
  {
    id: "DOC-1",
    clientId: "cli-acme",
    projectId: "prj-web",
    title: "Anforderungsspezifikation Portal",
    content: "Siehe [[Tot]]",
    tags: [],
    createdAt: "2026-10-01T00:00:00.000Z",
    updatedAt: "2026-10-01T00:00:00.000Z",
  },
];

describe("vault-health", () => {
  it("extracts wikilinks", () => {
    expect(extractWikilinks("A [[Alpha]] und [[Beta Gamma]].")).toEqual(["Alpha", "Beta Gamma"]);
  });

  it("reports overdue and excludes done", () => {
    const snap = computeVaultHealth(
      {
        clients,
        projects,
        docs: [],
        tasks: [
          makeTask({
            id: "A-1",
            issueKey: "ACM-WEB-1",
            title: "Late",
            status: "in-progress",
            dueDate: "2026-10-01",
            clientId: "cli-acme",
            projectId: "prj-web",
            cycle: "Sprint 12",
            timeLogs: [{ id: "tl1", hours: 2.5, date: "2026-10-02", createdAt: "2026-10-02T00:00:00.000Z" }],
            estimateHours: 8,
          }),
          makeTask({
            id: "A-2",
            title: "Done late",
            status: "done",
            dueDate: "2026-10-01",
            clientId: "cli-acme",
            projectId: "prj-web",
            updatedAt: "2026-10-07T12:00:00.000Z",
          }),
        ],
      },
      new Date("2026-10-08T12:00:00.000Z")
    );

    expect(snap.overdue).toHaveLength(1);
    expect(snap.overdue[0].key).toBe("ACM-WEB-1");
    expect(snap.overdue[0].daysOverdue).toBe(7);
    expect(snap.timeRows[0].hours).toBe(2.5);
    expect(snap.cycles.find(c => c.cycle === "Sprint 12")?.inProgress).toBe(1);
  });

  it("lints orphans, duplicate keys, broken wikilinks", () => {
    const issues = lintVaultData({
      clients,
      projects,
      docs,
      tasks: [
        makeTask({
          id: "T-1",
          issueKey: "DUP",
          clientId: "cli-ghost",
          projectId: "prj-missing",
          description: "Link [[Existiert-Nicht]] und [[Anforderungsspezifikation Portal]]",
          dependencies: ["MISSING-DEP"],
        }),
        makeTask({
          id: "T-2",
          issueKey: "DUP",
          clientId: "cli-acme",
          projectId: "prj-web",
        }),
      ],
    });

    const codes = new Set(issues.map(i => i.code));
    expect(codes.has("orphan-client")).toBe(true);
    expect(codes.has("orphan-project")).toBe(true);
    expect(codes.has("duplicate-issue-key")).toBe(true);
    expect(codes.has("broken-wikilink")).toBe(true);
    expect(codes.has("orphan-dependency")).toBe(true);
    expect(issues.some(i => i.message.includes("Existiert-Nicht"))).toBe(true);
    expect(issues.some(i => i.message.includes("[[Anforderungsspezifikation Portal]]"))).toBe(false);
    expect(issues.some(i => i.message.includes("[[Tot]]"))).toBe(true);
  });

  it("renders markdown report with sections", () => {
    const snap = computeVaultHealth({
      clients,
      projects,
      docs: [],
      tasks: [makeTask({ id: "T-1", dueDate: "2026-09-01", status: "todo", clientId: "cli-acme", projectId: "prj-web" })],
    }, new Date("2026-10-08T12:00:00.000Z"));
    const md = renderHealthMarkdown(snap);
    expect(md).toContain("## Überfällig");
    expect(md).toContain("## Cycle-Status");
    expect(md).toContain("## Prüfung");
  });
});
