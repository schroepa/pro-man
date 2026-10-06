/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, vi } from "vitest";
import {
  VaultStorage,
  isVaultPermissionError,
} from "./file-system";
import {
  normalizeClientProjectCodes,
  sanitizeCode,
  deriveCodeFromName,
  store,
} from "./store";
import { resetStoreMaps, storeInternals } from "../test/helpers";

describe("Vault permission helpers", () => {
  it("detects NotAllowedError and SecurityError", () => {
    expect(isVaultPermissionError({ name: "NotAllowedError", message: "x" })).toBe(true);
    expect(isVaultPermissionError({ name: "SecurityError", message: "x" })).toBe(true);
    expect(isVaultPermissionError({ name: "TypeError", message: "oops" })).toBe(false);
    expect(isVaultPermissionError({ name: "Error", message: "Permission denied" })).toBe(true);
  });

  it("demotes connected handle to permission_needed", () => {
    const vault = new VaultStorage();
    const fakeHandle = { name: "MyVault" } as FileSystemDirectoryHandle;
    (vault as unknown as { dirHandle: FileSystemDirectoryHandle }).dirHandle = fakeHandle;
    expect(vault.connectionState).toBe("connected");
    expect(vault.demoteToPermissionNeeded()).toBe(true);
    expect(vault.connectionState).toBe("permission_needed");
    expect(vault.isConnected).toBe(false);
    expect(vault.vaultName).toBe("MyVault");
  });

  it("consumeUserAbort clears abort marker from connect cancel", async () => {
    const vault = new VaultStorage();
    (vault as unknown as { isSupported: boolean }).isSupported = true;
    (window as unknown as { showDirectoryPicker: unknown }).showDirectoryPicker = vi
      .fn()
      .mockRejectedValue(Object.assign(new Error("cancel"), { name: "AbortError" }));
    const ok = await vault.connect();
    expect(ok).toBe(false);
    expect(vault.consumeUserAbort()).toBe(true);
    expect(vault.consumeUserAbort()).toBe(false);
  });

  it("ensureWritableAccess demotes when permission is denied", async () => {
    const vault = new VaultStorage();
    const fakeHandle = {
      name: "Vault",
      queryPermission: vi.fn().mockResolvedValue("denied"),
    } as unknown as FileSystemDirectoryHandle;
    (vault as unknown as { dirHandle: FileSystemDirectoryHandle }).dirHandle = fakeHandle;
    const access = await vault.ensureWritableAccess();
    expect(access).toBe("denied");
    expect(vault.connectionState).toBe("permission_needed");
  });
});

describe("Client/project code normalization", () => {
  it("fills missing codes from names", () => {
    const clients = [{ name: "Acme Corp", code: "" }];
    const projects = [{ name: "Web Portal", code: undefined as unknown as string }];
    normalizeClientProjectCodes(clients, projects);
    expect(sanitizeCode(clients[0].code).length).toBeGreaterThan(0);
    expect(sanitizeCode(projects[0].code).length).toBeGreaterThan(0);
    expect(deriveCodeFromName("Web Portal")).toBe("WP");
  });

  it("reloadAll returns permission_denied when access is denied", async () => {
    resetStoreMaps();
    const vault = store.vault;
    const fakeHandle = {
      name: "Vault",
      queryPermission: vi.fn().mockResolvedValue("denied"),
    } as unknown as FileSystemDirectoryHandle;
    (vault as unknown as { dirHandle: FileSystemDirectoryHandle }).dirHandle = fakeHandle;

    const result = await store.reloadAll();
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("permission_denied");
    }
    expect(vault.connectionState).toBe("permission_needed");
    storeInternals().tasks.clear();
  });
});
