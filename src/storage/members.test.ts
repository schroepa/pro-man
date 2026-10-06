/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, beforeEach } from "vitest";
import { store } from "./store";
import { DEFAULT_MEMBER_YOU_ID } from "../types/member";
import { makeTask, resetStoreMaps, seedClientProject, stubVaultWrites, storeInternals } from "../test/helpers";
import { t } from "../i18n";
import { readSrc } from "../test/helpers";

describe("Workspace members", () => {
  beforeEach(() => {
    resetStoreMaps();
    stubVaultWrites();
    localStorage.clear();
  });

  function seedDefaultYou(): void {
    const s = storeInternals() as StoreMapsWithMembers;
    s.members.clear();
    s.members.set(DEFAULT_MEMBER_YOU_ID, {
      id: DEFAULT_MEMBER_YOU_ID,
      name: t().members.defaultYou,
      kind: "internal",
      role: t().members.defaultYouRole,
      color: "#c25e1a",
    });
  }

  it("upsertMemberDraft creates external people by default", async () => {
    seedDefaultYou();
    const created = await store.upsertMemberDraft({
      name: "Alex Dev",
      role: "Developer",
      email: "alex@example.com",
    });
    expect(created).not.toBeNull();
    expect(created!.kind).toBe("external");
    expect(store.getMember(created!.id)?.role).toBe("Developer");
    expect(store.getMembers().length).toBe(2);
    expect(store.getMembers().some(m => m.name === "Optional")).toBe(false);
  });

  it("deleteMember clears assignee on tasks", async () => {
    seedDefaultYou();
    const { clientId, projectId } = seedClientProject();
    const person = await store.upsertMemberDraft({ name: "Extern", kind: "external" });
    const task = makeTask({
      id: "TASK-A",
      clientId,
      projectId,
      assigneeId: person!.id,
    });
    storeInternals().tasks.set(task.id, task);

    const result = await store.deleteMember(person!.id);
    expect(result.ok).toBe(true);
    expect(result.clearedTasks).toBe(1);
    expect(store.getTask("TASK-A")?.assigneeId).toBeUndefined();
  });

  it("updateMember renames people", async () => {
    seedDefaultYou();
    const you = store.getMember(DEFAULT_MEMBER_YOU_ID)!;
    await store.updateMember({ ...you, name: "Patrick", role: "Designer" });
    expect(store.getMember(DEFAULT_MEMBER_YOU_ID)?.name).toBe("Patrick");
  });
});

type StoreMapsWithMembers = ReturnType<typeof storeInternals> & {
  members: Map<string, { id: string; name: string; kind?: string; role?: string; color?: string }>;
};

describe("Members UX contracts", () => {
  it("task dialog supports inline add-person flow", () => {
    const src = readSrc("components/task-dialog.ts");
    expect(src).toContain("__add_member__");
    expect(src).toContain("task-add-member-panel");
    expect(src).toContain("upsertMemberDraft");
    expect(src).toContain("custom-select-menu");
  });

  it("backoffice exposes team tab for people management", () => {
    const src = readSrc("views/backoffice-view.ts");
    expect(src).toContain('"team"');
    expect(src).toContain("renderTeamTabHTML");
    expect(src).toContain("attachTeamEventListeners");
    expect(src).toContain("deleteMember");
  });
});
