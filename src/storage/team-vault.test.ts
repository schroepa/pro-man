/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { store } from "./store";
import { VaultStorage } from "./file-system";
import { DEFAULT_MEMBER_YOU_ID } from "../types/member";
import { resetStoreMaps, stubVaultWrites, storeInternals, readSrc } from "../test/helpers";
import { t } from "../i18n";

describe("Session identity", () => {
  beforeEach(() => {
    resetStoreMaps();
    stubVaultWrites();
    localStorage.clear();
  });

  function seedMembers(): void {
    const s = storeInternals() as {
      members: Map<string, { id: string; name: string; kind?: string; role?: string; color?: string }>;
    };
    s.members.clear();
    s.members.set(DEFAULT_MEMBER_YOU_ID, {
      id: DEFAULT_MEMBER_YOU_ID,
      name: t().members.defaultYou,
      kind: "internal",
      role: t().members.defaultYouRole,
      color: "#c25e1a",
    });
    s.members.set("mem-alex", {
      id: "mem-alex",
      name: "Alex",
      kind: "external",
      role: "Developer",
      color: "#3b82f6",
    });
  }

  it("persists active member id in localStorage", () => {
    seedMembers();
    store.setActiveMemberId("mem-alex");
    expect(localStorage.getItem("proman_active_member_id")).toBe("mem-alex");
    expect(store.getActiveMemberId()).toBe("mem-alex");
    expect(store.getSessionMember()?.name).toBe("Alex");
    expect(store.getDefaultAssigneeId()).toBe("mem-alex");
  });

  it("falls back when active member is missing", () => {
    seedMembers();
    store.setActiveMemberId("mem-gone");
    expect(store.getActiveMemberId()).toBeNull();
    expect(store.getSessionMember()?.id).toBe(DEFAULT_MEMBER_YOU_ID);
  });

  it("hasOnlyDefaultTeamRoster is true for placeholder Ich only", () => {
    seedMembers();
    const s = storeInternals() as { members: Map<string, unknown> };
    s.members.delete("mem-alex");
    expect(store.hasOnlyDefaultTeamRoster()).toBe(true);
    seedMembers();
    expect(store.hasOnlyDefaultTeamRoster()).toBe(false);
  });

  it("clears active member when that person is deleted", async () => {
    seedMembers();
    store.setActiveMemberId("mem-alex");
    await store.deleteMember("mem-alex");
    expect(store.getActiveMemberId()).toBeNull();
  });
});

describe("Vault fingerprint Soft Concurrent", () => {
  it("detects added, removed, and changed stamps", () => {
    const vault = new VaultStorage();
    const baseline = {
      "clients.json": { lastModified: 100, size: 10 },
      "tasks/A.md": { lastModified: 200, size: 20 },
    };
    expect(vault.isFingerprintStale(baseline, baseline)).toBe(false);
    expect(
      vault.isFingerprintStale(baseline, {
        ...baseline,
        "tasks/A.md": { lastModified: 201, size: 20 },
      })
    ).toBe(true);
    expect(
      vault.isFingerprintStale(baseline, {
        "clients.json": { lastModified: 100, size: 10 },
      })
    ).toBe(true);
    expect(
      vault.isFingerprintStale(baseline, {
        ...baseline,
        "tasks/B.md": { lastModified: 1, size: 1 },
      })
    ).toBe(true);
  });

  it("confirmWriteIfStale reloads when user declines force-save", async () => {
    resetStoreMaps();
    stubVaultWrites();
    localStorage.clear();

    const reloadSpy = vi.spyOn(store, "reloadAll").mockResolvedValue({ ok: true });
    const checkSpy = vi.spyOn(store, "checkVaultFreshness").mockImplementation(async () => {
      (store as unknown as { _vaultStale: boolean })._vaultStale = true;
      return true;
    });
    Object.defineProperty(store.vault, "isConnected", { get: () => true, configurable: true });
    (store as unknown as { allowStaleWrites: boolean }).allowStaleWrites = false;
    (store as unknown as { _vaultStale: boolean })._vaultStale = true;

    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);
    const result = await store.confirmWriteIfStale();
    expect(result).toBe("reloaded");
    expect(reloadSpy).toHaveBeenCalled();

    confirmSpy.mockReturnValue(true);
    (store as unknown as { _vaultStale: boolean })._vaultStale = true;
    (store as unknown as { allowStaleWrites: boolean }).allowStaleWrites = false;
    const forced = await store.confirmWriteIfStale();
    expect(forced).toBe("proceed");
    expect((store as unknown as { allowStaleWrites: boolean }).allowStaleWrites).toBe(true);

    confirmSpy.mockRestore();
    reloadSpy.mockRestore();
    checkSpy.mockRestore();
  });
});

describe("Team-Vault UX contracts", () => {
  it("sidebar exposes session identity and team setup path", () => {
    const src = readSrc("components/sidebar.ts");
    expect(src).toContain("sidebar-active-member-mount");
    expect(src).toContain("setActiveMemberId");
    expect(src).toContain("CustomSelect");
    expect(src).toContain("teamSetupHint");
    expect(src).toContain("proman_backoffice_tab");
    expect(src).not.toMatch(/<select[\s>]/);
  });

  it("stale banner component exists and reloads", () => {
    const src = readSrc("components/vault-stale-banner.ts");
    expect(src).toContain("vault-stale-banner");
    expect(src).toContain("reloadAll");
    expect(src).toContain("staleReload");
  });

  it("task dialog uses session member for comments and default assignee", () => {
    const src = readSrc("components/task-dialog.ts");
    expect(src).toContain("getSessionMember");
    expect(src).toContain("getDefaultAssigneeId");
  });

  it("playbook doc exists", () => {
    const doc = readFileSync(join(process.cwd(), "docs/TEAM-VAULT.md"), "utf8");
    expect(doc).toContain("Soft Concurrent");
    expect(doc).toContain("NAS");
  });
});
