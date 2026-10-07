/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { store } from "./store";
import { VaultStorage, type VaultFingerprint } from "./file-system";
import { DEFAULT_MEMBER_YOU_ID } from "../types/member";
import {
  resetStoreMaps,
  stubVaultWrites,
  storeInternals,
  readSrc,
  makeTask,
  seedClientProject,
  mockVaultFreshness,
  type VaultFreshnessMock,
} from "../test/helpers";
import { t, translations, setLanguage } from "../i18n";
import { renderVaultStaleBanner } from "../components/vault-stale-banner";

const BASE_FP: VaultFingerprint = {
  "clients.json": { lastModified: 1000, size: 100 },
  "tasks/ACM-WEB-1.md": { lastModified: 2000, size: 200 },
};

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

  it("ignores archived active member", () => {
    seedMembers();
    const s = storeInternals() as {
      members: Map<string, { id: string; name: string; archived?: boolean }>;
    };
    s.members.set("mem-alex", { id: "mem-alex", name: "Alex", archived: true });
    localStorage.setItem("proman_active_member_id", "mem-alex");
    expect(store.getActiveMemberId()).toBeNull();
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
  it("detects added, removed, mtime, and size-only changes", () => {
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
        ...baseline,
        "tasks/A.md": { lastModified: 200, size: 99 },
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
});

describe("Vault freshness + write guard", () => {
  let freshness: VaultFreshnessMock | null = null;

  beforeEach(() => {
    resetStoreMaps();
    stubVaultWrites();
    localStorage.clear();
    store.onVaultDisconnected();
  });

  afterEach(() => {
    freshness?.restore();
    freshness = null;
    vi.restoreAllMocks();
  });

  it("checkVaultFreshness stays clean when disk matches baseline", async () => {
    freshness = await mockVaultFreshness({
      baseline: BASE_FP,
      current: { ...BASE_FP },
    });
    expect(await store.checkVaultFreshness()).toBe(false);
    expect(store.vaultStale).toBe(false);
  });

  it("checkVaultFreshness marks stale when mtime or size changes", async () => {
    freshness = await mockVaultFreshness({
      baseline: BASE_FP,
      current: {
        ...BASE_FP,
        "tasks/ACM-WEB-1.md": { lastModified: 2001, size: 200 },
      },
    });
    expect(await store.checkVaultFreshness()).toBe(true);
    expect(store.vaultStale).toBe(true);

    await freshness.refreshBaseline();
    freshness.setCurrent({
      ...BASE_FP,
      "clients.json": { lastModified: 1000, size: 111 },
    });
    expect(await store.checkVaultFreshness()).toBe(true);
  });

  it("onVaultDisconnected clears stale state", async () => {
    freshness = await mockVaultFreshness({
      baseline: BASE_FP,
      current: {
        ...BASE_FP,
        "clients.json": { lastModified: 9999, size: 100 },
      },
    });
    await store.checkVaultFreshness();
    expect(store.vaultStale).toBe(true);

    store.onVaultDisconnected();
    expect(store.vaultStale).toBe(false);
    // restore() also disconnects — prevent double-restore issues
    freshness = null;
    delete (store.vault as { isConnected?: unknown }).isConnected;
  });

  it("confirmWriteIfStale reloads when user declines force-save", async () => {
    freshness = await mockVaultFreshness({
      baseline: BASE_FP,
      current: {
        ...BASE_FP,
        "clients.json": { lastModified: 5000, size: 100 },
      },
    });
    await store.checkVaultFreshness();
    expect(store.vaultStale).toBe(true);

    const reloadSpy = vi.spyOn(store, "reloadAll").mockResolvedValue({ ok: true });
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);

    expect(await store.confirmWriteIfStale()).toBe("reloaded");
    expect(reloadSpy).toHaveBeenCalledTimes(1);

    confirmSpy.mockReturnValue(true);
    // Still stale until reload/afterWrite — force acknowledge once
    expect(await store.confirmWriteIfStale()).toBe("proceed");
    expect(confirmSpy).toHaveBeenCalledTimes(2);
    // allowStaleWrites: further writes skip the dialog
    expect(await store.confirmWriteIfStale()).toBe("proceed");
    expect(confirmSpy).toHaveBeenCalledTimes(2);
  });

  it("saveOrUpdateTask does not write when user chooses reload", async () => {
    freshness = await mockVaultFreshness({
      baseline: BASE_FP,
      current: {
        ...BASE_FP,
        "tasks/ACM-WEB-1.md": { lastModified: 3000, size: 200 },
      },
    });
    await store.checkVaultFreshness();

    const { clientId, projectId } = seedClientProject();
    const saveSpy = vi.fn(async () => {});
    storeInternals().storage.saveTask = saveSpy;
    vi.spyOn(store, "reloadAll").mockResolvedValue({ ok: true });
    vi.spyOn(window, "confirm").mockReturnValue(false);

    await store.saveOrUpdateTask(
      makeTask({ id: "ACM-WEB-9", clientId, projectId, title: "Should not persist" })
    );

    expect(saveSpy).not.toHaveBeenCalled();
    expect(storeInternals().tasks.has("ACM-WEB-9")).toBe(false);
  });

  it("saveOrUpdateTask writes after force-save and skips second confirm", async () => {
    freshness = await mockVaultFreshness({
      baseline: BASE_FP,
      current: {
        ...BASE_FP,
        "tasks/ACM-WEB-1.md": { lastModified: 3000, size: 200 },
      },
    });
    await store.checkVaultFreshness();

    const { clientId, projectId } = seedClientProject();
    const saveSpy = vi.fn(async () => {});
    storeInternals().storage.saveTask = saveSpy;
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);

    const task = makeTask({ id: "ACM-WEB-10", clientId, projectId, title: "Force save" });
    await store.saveOrUpdateTask(task);
    expect(saveSpy).toHaveBeenCalledTimes(1);
    expect(confirmSpy).toHaveBeenCalledTimes(1);

    // afterVaultWrite refreshes fingerprint from current disk mock → not stale
    expect(store.vaultStale).toBe(false);

    // Make disk diverge again; allowStaleWrites was cleared by afterVaultWrite
    freshness.setCurrent({
      ...BASE_FP,
      "tasks/ACM-WEB-1.md": { lastModified: 4000, size: 200 },
    });
    await store.checkVaultFreshness();
    expect(store.vaultStale).toBe(true);

    await store.saveOrUpdateTask({ ...task, title: "Second force", updatedAt: new Date().toISOString() });
    expect(confirmSpy).toHaveBeenCalledTimes(2);
    expect(saveSpy).toHaveBeenCalledTimes(2);

    // Within acknowledged window: second write after force without new confirm
    await store.saveOrUpdateTask({ ...task, title: "Third", updatedAt: new Date().toISOString() });
    expect(confirmSpy).toHaveBeenCalledTimes(2);
    expect(saveSpy).toHaveBeenCalledTimes(3);
  });

  it("confirmWriteIfStale proceeds without dialog when offline", async () => {
    freshness = await mockVaultFreshness({
      connected: false,
      baseline: BASE_FP,
      current: BASE_FP,
    });
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);
    expect(await store.confirmWriteIfStale()).toBe("proceed");
    expect(confirmSpy).not.toHaveBeenCalled();
  });
});

describe("Vault stale banner", () => {
  let freshness: VaultFreshnessMock | null = null;

  beforeEach(() => {
    resetStoreMaps();
    stubVaultWrites();
    localStorage.clear();
    store.onVaultDisconnected();
  });

  afterEach(() => {
    freshness?.restore();
    freshness = null;
    vi.restoreAllMocks();
  });

  it("returns null when not connected or not stale", async () => {
    expect(renderVaultStaleBanner()).toBeNull();

    freshness = await mockVaultFreshness({
      baseline: BASE_FP,
      current: { ...BASE_FP },
    });
    await store.checkVaultFreshness();
    expect(store.vaultStale).toBe(false);
    expect(renderVaultStaleBanner()).toBeNull();
  });

  it("renders reload control when connected and stale", async () => {
    freshness = await mockVaultFreshness({
      baseline: BASE_FP,
      current: {
        ...BASE_FP,
        "docs/DOC-1.md": { lastModified: 1, size: 1 },
      },
    });
    await store.checkVaultFreshness();
    expect(store.vaultStale).toBe(true);

    const banner = renderVaultStaleBanner();
    expect(banner).not.toBeNull();
    expect(banner!.classList.contains("vault-stale-banner")).toBe(true);
    expect(banner!.querySelector(".vault-stale-reload-btn")).toBeTruthy();

    const reloadSpy = vi.spyOn(store, "reloadAll").mockResolvedValue({ ok: true });
    banner!.querySelector<HTMLButtonElement>(".vault-stale-reload-btn")!.click();
    await vi.waitFor(() => expect(reloadSpy).toHaveBeenCalled());
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

  it("write paths call confirmWriteIfStale", () => {
    const src = readSrc("storage/store.ts");
    expect(src).toMatch(/async saveOrUpdateTask[\s\S]*confirmWriteIfStale/);
    expect(src).toMatch(/async persistClients[\s\S]*confirmWriteIfStale/);
    expect(src).toMatch(/async saveDoc[\s\S]*confirmWriteIfStale/);
  });

  it("playbook doc exists", () => {
    const doc = readFileSync(join(process.cwd(), "docs/TEAM-VAULT.md"), "utf8");
    expect(doc).toContain("Soft Concurrent");
    expect(doc).toContain("NAS");
  });

  it("vault team strings exist in de and en", () => {
    const keys = ["staleBanner", "staleSaveConfirm", "iAm", "teamSharedHint", "staleReload"] as const;
    for (const catalog of [translations.de, translations.en]) {
      for (const key of keys) {
        expect(catalog.vault[key].length).toBeGreaterThan(2);
      }
    }
    setLanguage("de");
    expect(t().vault.iAm.length).toBeGreaterThan(1);
  });
});
