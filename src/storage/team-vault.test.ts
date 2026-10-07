/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { store } from "./store";
import { VaultStorage, contentDigest, type VaultFingerprint } from "./file-system";
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
import { setStaleWriteConfirmForTests } from "../components/vault-stale-confirm";

const stamp = (lastModified: number, size: number, digest = "d0"): VaultFingerprint[string] => ({
  lastModified,
  size,
  digest,
});

const BASE_FP: VaultFingerprint = {
  "clients.json": stamp(1000, 100, "c1"),
  "tasks/ACM-WEB-1.md": stamp(2000, 200, "t1"),
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
  it("detects added, removed, mtime, size, and digest-only changes", () => {
    const vault = new VaultStorage();
    const baseline: VaultFingerprint = {
      "clients.json": stamp(100, 10, "a"),
      "tasks/A.md": stamp(200, 20, "b"),
    };
    expect(vault.isFingerprintStale(baseline, baseline)).toBe(false);
    expect(
      vault.isFingerprintStale(baseline, {
        ...baseline,
        "tasks/A.md": stamp(201, 20, "b"),
      })
    ).toBe(true);
    expect(
      vault.isFingerprintStale(baseline, {
        ...baseline,
        "tasks/A.md": stamp(200, 99, "b"),
      })
    ).toBe(true);
    expect(
      vault.isFingerprintStale(baseline, {
        ...baseline,
        "tasks/A.md": stamp(200, 20, "changed"),
      })
    ).toBe(true);
    expect(vault.diffFingerprintPaths(baseline, {
      ...baseline,
      "tasks/A.md": stamp(200, 20, "changed"),
    })).toEqual(["tasks/A.md"]);
    expect(
      vault.isFingerprintStale(baseline, {
        "clients.json": stamp(100, 10, "a"),
      })
    ).toBe(true);
  });

  it("contentDigest changes when text changes", () => {
    expect(contentDigest("hello")).toBe(contentDigest("hello"));
    expect(contentDigest("hello")).not.toBe(contentDigest("hello!"));
  });

  it("writeTextAtomic is used for vault writes", () => {
    const src = readSrc("storage/file-system.ts");
    expect(src).toContain("writeTextAtomic");
    expect(src).toMatch(/async saveTask[\s\S]*writeTextAtomic/);
    expect(src).toMatch(/async saveDoc[\s\S]*writeTextAtomic/);
    expect(src).toMatch(/async saveClientsAndProjects[\s\S]*writeTextAtomic/);
  });
});

describe("Vault freshness + write guard", () => {
  let freshness: VaultFreshnessMock | null = null;

  beforeEach(() => {
    resetStoreMaps();
    stubVaultWrites();
    localStorage.clear();
    store.onVaultDisconnected();
    setStaleWriteConfirmForTests(null);
  });

  afterEach(() => {
    setStaleWriteConfirmForTests(null);
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
    expect(store.vaultStalePaths).toEqual([]);
  });

  it("checkVaultFreshness marks stale paths when mtime, size, or digest changes", async () => {
    freshness = await mockVaultFreshness({
      baseline: BASE_FP,
      current: {
        ...BASE_FP,
        "tasks/ACM-WEB-1.md": stamp(2001, 200, "t1"),
      },
    });
    expect(await store.checkVaultFreshness()).toBe(true);
    expect(store.vaultStale).toBe(true);
    expect(store.vaultStalePaths).toContain("tasks/ACM-WEB-1.md");

    await freshness.refreshBaseline();
    freshness.setCurrent({
      ...BASE_FP,
      "clients.json": stamp(1000, 100, "digest-changed"),
    });
    expect(await store.checkVaultFreshness()).toBe(true);
    expect(store.vaultStalePaths).toContain("clients.json");
  });

  it("onVaultDisconnected clears stale state", async () => {
    freshness = await mockVaultFreshness({
      baseline: BASE_FP,
      current: {
        ...BASE_FP,
        "clients.json": stamp(9999, 100, "c1"),
      },
    });
    await store.checkVaultFreshness();
    expect(store.vaultStale).toBe(true);

    store.onVaultDisconnected();
    expect(store.vaultStale).toBe(false);
    expect(store.vaultStalePaths).toEqual([]);
    freshness = null;
    delete (store.vault as { isConnected?: unknown }).isConnected;
  });

  it("confirmWriteIfStale reloads when dialog chooses reload", async () => {
    freshness = await mockVaultFreshness({
      baseline: BASE_FP,
      current: {
        ...BASE_FP,
        "clients.json": stamp(5000, 100, "c1"),
      },
    });
    await store.checkVaultFreshness();
    expect(store.vaultStale).toBe(true);

    const reloadSpy = vi.spyOn(store, "reloadAll").mockResolvedValue({ ok: true });
    setStaleWriteConfirmForTests(async () => "reload");

    expect(await store.confirmWriteIfStale()).toBe("reloaded");
    expect(reloadSpy).toHaveBeenCalledTimes(1);

    setStaleWriteConfirmForTests(async () => "force");
    expect(await store.confirmWriteIfStale()).toBe("proceed");
    expect(await store.confirmWriteIfStale()).toBe("proceed");
  });

  it("saveOrUpdateTask does not write when user chooses reload", async () => {
    freshness = await mockVaultFreshness({
      baseline: BASE_FP,
      current: {
        ...BASE_FP,
        "tasks/ACM-WEB-1.md": stamp(3000, 200, "t1"),
      },
    });
    await store.checkVaultFreshness();

    const { clientId, projectId } = seedClientProject();
    const saveSpy = vi.fn(async () => {});
    storeInternals().storage.saveTask = saveSpy;
    vi.spyOn(store, "reloadAll").mockResolvedValue({ ok: true });
    setStaleWriteConfirmForTests(async () => "reload");

    await store.saveOrUpdateTask(
      makeTask({ id: "ACM-WEB-9", clientId, projectId, title: "Should not persist" })
    );

    expect(saveSpy).not.toHaveBeenCalled();
    expect(storeInternals().tasks.has("ACM-WEB-9")).toBe(false);
  });

  it("saveOrUpdateTask writes after force-save", async () => {
    freshness = await mockVaultFreshness({
      baseline: BASE_FP,
      current: {
        ...BASE_FP,
        "tasks/ACM-WEB-1.md": stamp(3000, 200, "t1"),
      },
    });
    await store.checkVaultFreshness();

    const { clientId, projectId } = seedClientProject();
    const saveSpy = vi.fn(async () => {});
    storeInternals().storage.saveTask = saveSpy;
    let confirmCalls = 0;
    setStaleWriteConfirmForTests(async () => {
      confirmCalls++;
      return "force";
    });

    const task = makeTask({ id: "ACM-WEB-10", clientId, projectId, title: "Force save" });
    await store.saveOrUpdateTask(task);
    expect(saveSpy).toHaveBeenCalledTimes(1);
    expect(confirmCalls).toBe(1);
    expect(store.vaultStale).toBe(false);
  });

  it("confirmWriteIfStale proceeds without dialog when offline", async () => {
    freshness = await mockVaultFreshness({
      connected: false,
      baseline: BASE_FP,
      current: BASE_FP,
    });
    let called = false;
    setStaleWriteConfirmForTests(async () => {
      called = true;
      return "force";
    });
    expect(await store.confirmWriteIfStale()).toBe("proceed");
    expect(called).toBe(false);
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

  it("renders paths and reload; dismiss hides until fresh again", async () => {
    freshness = await mockVaultFreshness({
      baseline: BASE_FP,
      current: {
        ...BASE_FP,
        "docs/DOC-1.md": stamp(1, 1, "d"),
      },
    });
    await store.checkVaultFreshness();
    expect(store.vaultStale).toBe(true);
    expect(store.staleBannerVisible).toBe(true);

    const banner = renderVaultStaleBanner();
    expect(banner).not.toBeNull();
    expect(banner!.textContent).toContain("docs/DOC-1.md");
    expect(banner!.querySelector(".vault-stale-reload-btn")).toBeTruthy();
    expect(banner!.querySelector(".vault-stale-dismiss-btn")).toBeTruthy();

    banner!.querySelector<HTMLButtonElement>(".vault-stale-dismiss-btn")!.click();
    expect(store.staleBannerVisible).toBe(false);
    expect(store.vaultStale).toBe(true);
    expect(renderVaultStaleBanner()).toBeNull();

    const reloadSpy = vi.spyOn(store, "reloadAll").mockResolvedValue({ ok: true });
    // Re-show after new stale cycle
    await freshness.refreshBaseline();
    freshness.setCurrent({
      ...BASE_FP,
      "clients.json": stamp(1, 1, "x"),
    });
    await store.checkVaultFreshness();
    expect(store.staleBannerVisible).toBe(true);

    const again = renderVaultStaleBanner()!;
    again.querySelector<HTMLButtonElement>(".vault-stale-reload-btn")!.click();
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

  it("stale confirm uses app dialog not window.confirm", () => {
    const storeSrc = readSrc("storage/store.ts");
    expect(storeSrc).toContain("askStaleWriteConfirm");
    expect(storeSrc).not.toMatch(/window\.confirm/);
    const confirmSrc = readSrc("components/vault-stale-confirm.ts");
    expect(confirmSrc).toContain("vault-stale-confirm");
    expect(confirmSrc).toContain("staleForceSave");
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
    expect(doc).toContain("Digest");
    expect(doc).toContain("Atomic");
  });

  it("vault team strings exist in de and en", () => {
    const keys = [
      "staleBanner",
      "staleConfirmTitle",
      "staleForceSave",
      "staleDismiss",
      "iAm",
      "teamSharedHint",
      "staleReload",
    ] as const;
    for (const catalog of [translations.de, translations.en]) {
      for (const key of keys) {
        expect(catalog.vault[key].length).toBeGreaterThan(2);
      }
    }
    setLanguage("de");
    expect(t().vault.iAm.length).toBeGreaterThan(1);
  });
});
