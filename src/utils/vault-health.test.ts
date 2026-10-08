import { describe, it, expect } from "vitest";
import type { Client, Project } from "../types/client";
import type { DocItem } from "../types/doc";
import { makeTask } from "../test/helpers";
import {
  computeVaultHealth,
  explainFinding,
  extractWikilinks,
  lintVaultData,
  renderAiBriefing,
  renderHealthMarkdown,
  type FindingCopy,
} from "./vault-health";

const findingCopy: FindingCopy = {
  levelMust: "Sofort klären",
  levelSoon: "Bald ansehen",
  openItem: "Öffnen",
  findings: {
    orphanClient: {
      title: "Kunde fehlt",
      meaning: "„{subject}“ hängt an einem Kunden, den es so nicht mehr gibt.",
      action: "Eintrag öffnen.",
    },
    orphanProject: {
      title: "Projekt fehlt",
      meaning: "„{subject}“ hängt an einem Projekt, das nicht existiert.",
      action: "Eintrag öffnen.",
    },
    clientProjectMismatch: {
      title: "Mismatch",
      meaning: "Bei „{subject}“ passt Projekt „{detail}“ nicht zu {related}.",
      action: "Korrigieren.",
    },
    duplicateId: {
      title: "Doppelte ID",
      meaning: "ID „{subject}“ doppelt ({related}).",
      action: "Bereinigen.",
    },
    duplicateIssueKey: {
      title: "Doppelte Nummer",
      meaning: "Nummer „{subject}“ doppelt ({related}).",
      action: "Eindeutig machen.",
    },
    orphanDependency: {
      title: "Abhängigkeit fehlt",
      meaning: "„{subject}“ wartet auf „{detail}“.",
      action: "Abhängigkeit prüfen.",
    },
    brokenWikilink: {
      title: "Link ohne Ziel",
      meaning: "In „{subject}“ fehlt Dokument „{detail}“.",
      action: "Link oder Doc anpassen.",
    },
    unknown: {
      title: "Auffälligkeit",
      meaning: "{subject}",
      action: "Prüfen.",
    },
  },
};

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
    expect(issues.some(i => i.detail === "Existiert-Nicht")).toBe(true);
    expect(issues.some(i => i.detail === "Anforderungsspezifikation Portal")).toBe(false);
    expect(issues.some(i => i.detail === "Tot")).toBe(true);

    const orphan = issues.find(i => i.code === "orphan-client")!;
    const explained = explainFinding(orphan, findingCopy);
    expect(explained.title).toBe("Kunde fehlt");
    expect(explained.levelLabel).toBe("Sofort klären");
    expect(explained.meaning).toContain("hängt an einem Kunden");
    expect(explained.meaning).not.toContain("clientId");
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

  it("renders AI briefing with schema, open tasks, docs and knowledge index", () => {
    const md = renderAiBriefing(
      {
        clients,
        projects,
        docs,
        knowledge: [
          {
            id: "KN-1",
            clientId: "cli-acme",
            category: "colors",
            title: "Acme Palette",
            content: "Primary blue",
            tags: ["brand"],
            createdAt: "2026-10-01T00:00:00.000Z",
            updatedAt: "2026-10-01T00:00:00.000Z",
          },
        ],
        members: [{ id: "mem-alice", name: "Alice" }],
        tasks: [
          makeTask({
            id: "T-1",
            issueKey: "ACM-WEB-1",
            title: "Open work",
            status: "in-progress",
            priority: "high",
            dueDate: "2026-10-10",
            clientId: "cli-acme",
            projectId: "prj-web",
            assigneeId: "mem-alice",
            dependencies: ["T-0"],
          }),
          makeTask({
            id: "T-2",
            title: "Done skip",
            status: "done",
            clientId: "cli-acme",
            projectId: "prj-web",
          }),
        ],
      },
      new Date("2026-10-08T12:00:00.000Z")
    );

    expect(md).toContain("# ProMan KI-Briefing");
    expect(md).toContain("## Schema");
    expect(md).toContain("tasks/<ISSUE-KEY>.md");
    expect(md).toContain("## Offene Tasks");
    expect(md).toContain("ACM-WEB-1");
    expect(md).toContain("Alice");
    expect(md).toContain("T-0");
    const openSection = md.slice(md.indexOf("## Offene Tasks"), md.indexOf("## Docs"));
    expect(openSection).toContain("ACM-WEB-1");
    expect(openSection).not.toContain("Done skip");
    expect(md).toContain("## Docs");
    expect(md).toContain("DOC-1");
    expect(md).toContain("Anforderungsspezifikation Portal");
    expect(md).toContain("## Wissen");
    expect(md).toContain("KN-1");
    expect(md).toContain("Acme Palette");
    expect(md).toContain("## Wochen-Digest");
  });
});
