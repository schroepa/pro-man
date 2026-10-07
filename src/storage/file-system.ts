import { Task } from "../types/task";
import { DocItem } from "../types/doc";
import { taskToMarkdown, markdownToTask } from "./serializer";
import { docToMarkdown, markdownToDoc } from "./doc-serializer";

const DB_NAME = "pro_man_storage";
const STORE_NAME = "handles";
const HANDLE_KEY = "vault_dir_handle";
const TASKS_DIR = "tasks";
const TASKS_ARCHIVE_DIR = "archive";
const DOCS_DIR = "docs";
const ATTACHMENTS_DIR = "attachments";
const LAST_VAULTS_KEY = "pro_man_last_vaults";

export type VaultConnectionState = "connected" | "permission_needed" | "offline" | "unsupported";

/** mtime + size stamp for a vault-relative path (Soft Concurrent freshness). */
export type VaultFileStamp = { lastModified: number; size: number };
export type VaultFingerprint = Record<string, VaultFileStamp>;

const USER_ABORT = "USER_ABORT";

export function isVaultPermissionError(err: unknown): boolean {
  const e = err as { name?: string; message?: string } | null;
  const name = e?.name || "";
  if (name === "NotAllowedError" || name === "SecurityError") return true;
  return /notallowed|permission|not allowed|access denied/i.test(e?.message || "");
}

export function getLastVaultNames(): string[] {
  try {
    const raw = localStorage.getItem(LAST_VAULTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((n): n is string => typeof n === "string").slice(0, 3);
  } catch {
    return [];
  }
}

export function rememberVaultName(name: string): void {
  if (!name || name === "Local Cache") return;
  try {
    const prev = getLastVaultNames().filter(n => n !== name);
    const next = [name, ...prev].slice(0, 3);
    localStorage.setItem(LAST_VAULTS_KEY, JSON.stringify(next));
  } catch { /* ignore */ }
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE_NAME);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function saveHandle(handle: FileSystemDirectoryHandle): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(handle, HANDLE_KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function getSavedHandle(): Promise<FileSystemDirectoryHandle | null> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const req = tx.objectStore(STORE_NAME).get(HANDLE_KEY);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

async function clearHandle(): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, "readwrite");
  tx.objectStore(STORE_NAME).delete(HANDLE_KEY);
}

function isTaskFileName(name: string): boolean {
  return /^TASK[-_]/i.test(name) && name.endsWith(".md");
}

function isDocFileName(name: string): boolean {
  return name.endsWith(".md");
}

export class VaultStorage {
  private dirHandle: FileSystemDirectoryHandle | null = null;
  private pendingHandle: FileSystemDirectoryHandle | null = null;
  private isSupported: boolean = typeof window !== "undefined" && "showDirectoryPicker" in window;
  private lastError: string | null = null;
  private lastLoadWarning: string | null = null;

  public get supported(): boolean {
    return this.isSupported;
  }

  public get isConnected(): boolean {
    return this.dirHandle !== null;
  }

  public get vaultName(): string {
    if (this.dirHandle) return this.dirHandle.name;
    if (this.pendingHandle) return this.pendingHandle.name;
    return "Local Cache";
  }

  public get connectionState(): VaultConnectionState {
    if (this.dirHandle) return "connected";
    if (this.pendingHandle) return "permission_needed";
    if (!this.isSupported) return "unsupported";
    return "offline";
  }

  public getLastError(): string | null {
    return this.lastError;
  }

  public clearError(): void {
    this.lastError = null;
  }

  public getLastLoadWarning(): string | null {
    return this.lastLoadWarning;
  }

  public clearLoadWarning(): void {
    this.lastLoadWarning = null;
  }

  /** True if the last connect() was cancelled by the user (picker dismissed). */
  public consumeUserAbort(): boolean {
    if (this.lastError !== USER_ABORT) return false;
    this.lastError = null;
    return true;
  }

  /** Move active handle to pending so UI can prompt for permission again. */
  demoteToPermissionNeeded(): boolean {
    if (!this.dirHandle) return false;
    this.pendingHandle = this.dirHandle;
    this.dirHandle = null;
    return true;
  }

  private noteWriteError(err: unknown): void {
    const message = err instanceof Error ? err.message : String(err);
    this.lastError = message;
    if (isVaultPermissionError(err)) {
      this.demoteToPermissionNeeded();
    }
  }

  /**
   * Ensure we still have readwrite access to the vault directory.
   * Demotes to permission_needed when the browser revoked access.
   */
  async ensureWritableAccess(): Promise<"ok" | "denied" | "offline"> {
    if (!this.dirHandle) {
      return this.pendingHandle ? "denied" : "offline";
    }
    try {
      const handle = this.dirHandle as FileSystemDirectoryHandle & {
        queryPermission?: (desc: { mode: string }) => Promise<PermissionState>;
        requestPermission?: (desc: { mode: string }) => Promise<PermissionState>;
      };
      if (typeof handle.queryPermission !== "function") {
        return "ok";
      }
      let status = await handle.queryPermission({ mode: "readwrite" });
      if (status === "prompt" && typeof handle.requestPermission === "function") {
        status = await handle.requestPermission({ mode: "readwrite" });
      }
      if (status === "granted") return "ok";
      this.demoteToPermissionNeeded();
      this.lastError = "PERMISSION_DENIED";
      return "denied";
    } catch (err) {
      this.noteWriteError(err);
      if (!this.dirHandle) return "denied";
      return "denied";
    }
  }

  async tryRestore(): Promise<boolean> {
    if (!this.isSupported) return false;
    try {
      const saved = await getSavedHandle();
      if (!saved) return false;

      const handle = saved as any;
      let status = await handle.queryPermission({ mode: "readwrite" });
      if (status === "prompt") {
        status = await handle.requestPermission({ mode: "readwrite" });
      }
      if (status === "granted") {
        this.dirHandle = saved;
        this.pendingHandle = null;
        rememberVaultName(saved.name);
        return true;
      }
      this.pendingHandle = saved;
      this.dirHandle = null;
      return false;
    } catch {
      return false;
    }
  }

  async requestPendingPermission(): Promise<boolean> {
    if (!this.pendingHandle) return false;
    try {
      const status = await (this.pendingHandle as any).requestPermission({ mode: "readwrite" });
      if (status === "granted") {
        this.dirHandle = this.pendingHandle;
        this.pendingHandle = null;
        rememberVaultName(this.dirHandle.name);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  async connect(): Promise<boolean> {
    if (!this.isSupported) {
      this.lastError = "UNSUPPORTED";
      throw new Error("File System Access API is not supported in this browser. Using LocalStorage fallback.");
    }

    try {
      this.dirHandle = await (window as any).showDirectoryPicker({
        mode: "readwrite",
        startIn: "documents",
      });
      if (this.dirHandle) {
        await saveHandle(this.dirHandle);
        this.pendingHandle = null;
        rememberVaultName(this.dirHandle.name);
        await this.ensureVaultStructure();
        return true;
      }
      return false;
    } catch (err: unknown) {
      const name = err && typeof err === "object" && "name" in err ? String((err as { name: string }).name) : "";
      if (name === "AbortError") {
        this.lastError = USER_ABORT;
        return false;
      }
      this.noteWriteError(err);
      throw err;
    }
  }

  async disconnect(): Promise<void> {
    this.dirHandle = null;
    this.pendingHandle = null;
    await clearHandle();
  }

  private async ensureVaultStructure(): Promise<void> {
    if (!this.dirHandle) return;
    try {
      const tasksDir = await this.dirHandle.getDirectoryHandle(TASKS_DIR, { create: true });
      await tasksDir.getDirectoryHandle(TASKS_ARCHIVE_DIR, { create: true });
      await this.dirHandle.getDirectoryHandle(DOCS_DIR, { create: true });
      await this.dirHandle.getDirectoryHandle(ATTACHMENTS_DIR, { create: true });
    } catch (err) {
      console.warn("Could not ensure vault structure", err);
    }
  }

  private async getAttachmentsDir(create = false): Promise<FileSystemDirectoryHandle | null> {
    if (!this.dirHandle) return null;
    try {
      return await this.dirHandle.getDirectoryHandle(ATTACHMENTS_DIR, { create });
    } catch {
      return null;
    }
  }

  /**
   * Copy a File into vault `attachments/` and return the relative path.
   * Returns null when vault is not connected.
   */
  async copyAttachmentFile(file: File, preferredName?: string): Promise<string | null> {
    if (!this.dirHandle) return null;
    try {
      await this.ensureVaultStructure();
      const dir = await this.getAttachmentsDir(true);
      if (!dir) return null;

      const safeBase = (preferredName || file.name || "file")
        .replace(/[^\w.\-()+ ]+/g, "_")
        .replace(/\s+/g, "-")
        .slice(0, 120) || "file";
      const stamp = Date.now().toString(36);
      const fileName = `${stamp}-${safeBase}`;
      const fileHandle = await dir.getFileHandle(fileName, { create: true });
      const writable = await (fileHandle as any).createWritable();
      await writable.write(await file.arrayBuffer());
      await writable.close();
      return `${ATTACHMENTS_DIR}/${fileName}`;
    } catch (err: unknown) {
      this.noteWriteError(err);
      return null;
    }
  }

  private async getTasksDir(create = false): Promise<FileSystemDirectoryHandle | null> {
    if (!this.dirHandle) return null;
    try {
      return await this.dirHandle.getDirectoryHandle(TASKS_DIR, { create });
    } catch {
      return null;
    }
  }

  private async getTasksArchiveDir(create = false): Promise<FileSystemDirectoryHandle | null> {
    const tasksDir = await this.getTasksDir(create);
    if (!tasksDir) return null;
    try {
      return await tasksDir.getDirectoryHandle(TASKS_ARCHIVE_DIR, { create });
    } catch {
      return null;
    }
  }

  private taskFileName(taskId: string): string {
    return `${taskId}.md`;
  }

  private async getDocsDir(create = false): Promise<FileSystemDirectoryHandle | null> {
    if (!this.dirHandle) return null;
    try {
      return await this.dirHandle.getDirectoryHandle(DOCS_DIR, { create });
    } catch {
      return null;
    }
  }

  async loadAllTasks(): Promise<Task[]> {
    this.lastLoadWarning = null;
    if (!this.dirHandle) {
      return this.loadFallbackTasks();
    }

    const tasks: Task[] = [];
    const seen = new Set<string>();
    let failed = 0;

    try {
      const tasksDir = await this.getTasksDir(false);
      if (tasksDir) {
        for await (const entry of (tasksDir as any).values()) {
          if (entry.kind === "directory") continue;
          if (entry.kind === "file" && entry.name.endsWith(".md")) {
            try {
              const file = await entry.getFile();
              const text = await file.text();
              const fallbackId = entry.name.replace(/\.md$/, "");
              const task = markdownToTask(text, fallbackId);
              if (!seen.has(task.id)) {
                seen.add(task.id);
                tasks.push(task);
              }
            } catch (err) {
              if (isVaultPermissionError(err)) {
                this.noteWriteError(err);
                throw err;
              }
              failed += 1;
              console.warn(`Failed to parse task file ${entry.name}`, err);
            }
          }
        }
      }

      // Legacy root TASK-*.md — skip Obsidian / template folders
      for await (const entry of (this.dirHandle as any).values()) {
        if (entry.kind === "directory") {
          const name = String(entry.name || "").toLowerCase();
          if (name === ".obsidian" || name === "templates") continue;
        }
        if (entry.kind === "file" && isTaskFileName(entry.name)) {
          try {
            const file = await entry.getFile();
            const text = await file.text();
            const fallbackId = entry.name.replace(/\.md$/, "");
            const task = markdownToTask(text, fallbackId);
            if (!seen.has(task.id)) {
              seen.add(task.id);
              tasks.push(task);
            }
          } catch (err) {
            if (isVaultPermissionError(err)) {
              this.noteWriteError(err);
              throw err;
            }
            failed += 1;
            console.warn(`Failed to parse legacy task file ${entry.name}`, err);
          }
        }
      }
    } catch (err) {
      this.noteWriteError(err);
      if (isVaultPermissionError(err)) {
        return this.loadFallbackTasks();
      }
      throw err;
    }

    if (failed > 0) {
      this.lastLoadWarning = `LOAD_PARTIAL:${failed}`;
    }

    tasks.sort((a, b) => a.order - b.order);
    return tasks;
  }

  async loadArchivedTasks(): Promise<Task[]> {
    if (!this.dirHandle) {
      return this.loadFallbackArchivedTasks();
    }

    const tasks: Task[] = [];
    const seen = new Set<string>();

    try {
      const archiveDir = await this.getTasksArchiveDir(false);
      if (archiveDir) {
        for await (const entry of (archiveDir as any).values()) {
          if (entry.kind !== "file" || !entry.name.endsWith(".md")) continue;
          try {
            const file = await entry.getFile();
            const text = await file.text();
            const fallbackId = entry.name.replace(/\.md$/, "");
            const task = markdownToTask(text, fallbackId);
            if (!seen.has(task.id)) {
              seen.add(task.id);
              tasks.push(task);
            }
          } catch (err) {
            console.warn(`Failed to parse archived task ${entry.name}`, err);
          }
        }
      }
    } catch (err) {
      this.noteWriteError(err);
      if (isVaultPermissionError(err)) {
        return this.loadFallbackArchivedTasks();
      }
      throw err;
    }

    tasks.sort((a, b) => a.order - b.order);
    return tasks;
  }

  async saveTask(task: Task): Promise<void> {
    if (!this.dirHandle) {
      if (task.archivedAt) {
        this.saveFallbackArchivedTask(task);
      } else {
        this.saveFallbackTask(task);
      }
      return;
    }

    try {
      await this.ensureVaultStructure();
      const fileName = this.taskFileName(task.id);
      const markdown = taskToMarkdown(task);
      const targetDir = task.archivedAt
        ? await this.getTasksArchiveDir(true)
        : await this.getTasksDir(true);
      if (!targetDir) throw new Error("tasks directory unavailable");

      const fileHandle = await targetDir.getFileHandle(fileName, { create: true });
      const writable = await (fileHandle as any).createWritable();
      await writable.write(markdown);
      await writable.close();

      // Ensure file exists in only one location
      const otherDir = task.archivedAt
        ? await this.getTasksDir(false)
        : await this.getTasksArchiveDir(false);
      try {
        await otherDir?.removeEntry(fileName);
      } catch { /* ignore */ }

      // Remove legacy root copy if present
      try {
        await (this.dirHandle as any).removeEntry(fileName);
      } catch { /* ignore */ }
    } catch (err: unknown) {
      this.noteWriteError(err);
      if (task.archivedAt) {
        this.saveFallbackArchivedTask(task);
      } else {
        this.saveFallbackTask(task);
      }
      throw err;
    }
  }

  /** Move task markdown to `tasks/archive/` (never permanently delete vault files). */
  async archiveTask(task: Task): Promise<void> {
    const archived: Task = {
      ...task,
      archivedAt: task.archivedAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await this.saveTask(archived);
    if (!this.dirHandle) {
      this.deleteFallbackTask(task.id);
      return;
    }
    const fileName = this.taskFileName(task.id);
    try {
      const tasksDir = await this.getTasksDir(false);
      await tasksDir?.removeEntry(fileName);
    } catch { /* already moved via saveTask */ }
  }

  /** Move task back from `tasks/archive/` to active `tasks/`. */
  async restoreTask(task: Task): Promise<void> {
    const { archivedAt: _removed, ...rest } = task;
    const active: Task = {
      ...rest,
      updatedAt: new Date().toISOString(),
    };
    delete active.archivedAt;
    await this.saveTask(active);
    if (!this.dirHandle) {
      this.deleteFallbackArchivedTask(task.id);
      return;
    }
    const fileName = this.taskFileName(task.id);
    try {
      const archiveDir = await this.getTasksArchiveDir(false);
      await archiveDir?.removeEntry(fileName);
    } catch { /* already moved via saveTask */ }
  }

  /** Hard-remove a task file (undo of a brand-new task only — not user-facing delete). */
  async purgeTask(taskId: string): Promise<void> {
    if (!this.dirHandle) {
      this.deleteFallbackTask(taskId);
      this.deleteFallbackArchivedTask(taskId);
      return;
    }
    const fileName = this.taskFileName(taskId);
    try {
      const tasksDir = await this.getTasksDir(false);
      await tasksDir?.removeEntry(fileName);
    } catch { /* ignore */ }
    try {
      const archiveDir = await this.getTasksArchiveDir(false);
      await archiveDir?.removeEntry(fileName);
    } catch { /* ignore */ }
    try {
      await (this.dirHandle as any).removeEntry(fileName);
    } catch { /* legacy */ }
  }

  async loadAllDocs(): Promise<DocItem[]> {
    if (!this.dirHandle) {
      return this.loadFallbackDocs();
    }

    const docs: DocItem[] = [];
    const docsDir = await this.getDocsDir(false);
    if (!docsDir) return this.loadFallbackDocs();

    for await (const entry of (docsDir as any).values()) {
      if (entry.kind === "file" && isDocFileName(entry.name)) {
        try {
          const file = await entry.getFile();
          const text = await file.text();
          const fallbackId = entry.name.replace(/\.md$/, "");
          docs.push(markdownToDoc(text, fallbackId));
        } catch (err) {
          console.warn(`Failed to parse doc file ${entry.name}`, err);
        }
      }
    }
    return docs;
  }

  async saveDoc(doc: DocItem): Promise<void> {
    if (!this.dirHandle) {
      this.saveFallbackDoc(doc);
      return;
    }

    try {
      await this.ensureVaultStructure();
      const docsDir = await this.getDocsDir(true);
      if (!docsDir) throw new Error("docs/ directory unavailable");

      const fileName = `${doc.id}.md`;
      const markdown = docToMarkdown(doc);
      const fileHandle = await docsDir.getFileHandle(fileName, { create: true });
      const writable = await (fileHandle as any).createWritable();
      await writable.write(markdown);
      await writable.close();
    } catch (err: unknown) {
      this.noteWriteError(err);
      this.saveFallbackDoc(doc);
      throw err;
    }
  }

  async deleteDoc(docId: string): Promise<void> {
    if (!this.dirHandle) {
      this.deleteFallbackDoc(docId);
      return;
    }

    try {
      const docsDir = await this.getDocsDir(false);
      if (docsDir) {
        await (docsDir as any).removeEntry(`${docId}.md`);
      }
    } catch (err) {
      console.warn(`Could not delete doc ${docId}`, err);
    }
  }

  async saveClientsAndProjects(data: { clients: any[]; projects: any[]; members?: any[] }): Promise<void> {
    if (!this.dirHandle) {
      localStorage.setItem("pro_man_clients_data", JSON.stringify(data));
      if (data.members) {
        localStorage.setItem("pro_man_members", JSON.stringify(data.members));
      }
      return;
    }

    try {
      const fileHandle = await this.dirHandle.getFileHandle("clients.json", { create: true });
      const writable = await (fileHandle as any).createWritable();
      await writable.write(JSON.stringify(data, null, 2));
      await writable.close();
      if (data.members) {
        localStorage.setItem("pro_man_members", JSON.stringify(data.members));
      }
    } catch (err: unknown) {
      this.noteWriteError(err);
      console.warn("Failed to write clients.json to vault", err);
      localStorage.setItem("pro_man_clients_data", JSON.stringify(data));
      if (data.members) {
        localStorage.setItem("pro_man_members", JSON.stringify(data.members));
      }
    }
  }

  async loadClientsAndProjects(): Promise<{ clients: any[]; projects: any[]; members?: any[] } | null> {
    if (!this.dirHandle) {
      const raw = localStorage.getItem("pro_man_clients_data");
      if (raw) {
        try {
          return JSON.parse(raw);
        } catch {
          return null;
        }
      }
      const membersRaw = localStorage.getItem("pro_man_members");
      if (membersRaw) {
        try {
          return { clients: [], projects: [], members: JSON.parse(membersRaw) };
        } catch {
          return null;
        }
      }
      return null;
    }

    try {
      const fileHandle = await this.dirHandle.getFileHandle("clients.json");
      const file = await fileHandle.getFile();
      const text = await file.text();
      return JSON.parse(text);
    } catch {
      return null;
    }
  }

  /**
   * Snapshot of vault file mtimes/sizes for Soft Concurrent stale detection.
   * Returns null when offline / no handle.
   */
  async captureFingerprint(): Promise<VaultFingerprint | null> {
    if (!this.dirHandle) return null;
    const fp: VaultFingerprint = {};

    const stampFile = async (path: string, file: File): Promise<void> => {
      fp[path] = { lastModified: file.lastModified, size: file.size };
    };

    try {
      try {
        const clientsHandle = await this.dirHandle.getFileHandle("clients.json");
        const clientsFile = await clientsHandle.getFile();
        await stampFile("clients.json", clientsFile);
      } catch { /* missing ok */ }

      const tasksDir = await this.getTasksDir(false);
      if (tasksDir) {
        for await (const entry of (tasksDir as any).values()) {
          if (entry.kind === "file" && entry.name.endsWith(".md")) {
            try {
              const file = await entry.getFile();
              await stampFile(`${TASKS_DIR}/${entry.name}`, file);
            } catch { /* skip */ }
          }
        }
        const archiveDir = await this.getTasksArchiveDir(false);
        if (archiveDir) {
          for await (const entry of (archiveDir as any).values()) {
            if (entry.kind === "file" && entry.name.endsWith(".md")) {
              try {
                const file = await entry.getFile();
                await stampFile(`${TASKS_DIR}/${TASKS_ARCHIVE_DIR}/${entry.name}`, file);
              } catch { /* skip */ }
            }
          }
        }
      }

      const docsDir = await this.getDocsDir(false);
      if (docsDir) {
        for await (const entry of (docsDir as any).values()) {
          if (entry.kind === "file" && isDocFileName(entry.name)) {
            try {
              const file = await entry.getFile();
              await stampFile(`${DOCS_DIR}/${entry.name}`, file);
            } catch { /* skip */ }
          }
        }
      }
    } catch (err) {
      this.noteWriteError(err);
      return null;
    }

    return fp;
  }

  /** True when current disk stamps differ from baseline (added/removed/changed). */
  isFingerprintStale(baseline: VaultFingerprint | null, current: VaultFingerprint | null): boolean {
    if (!baseline || !current) return false;
    const keys = new Set([...Object.keys(baseline), ...Object.keys(current)]);
    for (const key of keys) {
      const a = baseline[key];
      const b = current[key];
      if (!a || !b) return true;
      if (a.lastModified !== b.lastModified || a.size !== b.size) return true;
    }
    return false;
  }

  private loadFallbackTasks(): Task[] {
    const raw = localStorage.getItem("pro_man_fallback_tasks");
    if (!raw) return [];
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  private saveFallbackTask(task: Task): void {
    const tasks = this.loadFallbackTasks();
    const idx = tasks.findIndex(t => t.id === task.id);
    if (idx !== -1) {
      tasks[idx] = task;
    } else {
      tasks.push(task);
    }
    localStorage.setItem("pro_man_fallback_tasks", JSON.stringify(tasks));
  }

  private deleteFallbackTask(taskId: string): void {
    const tasks = this.loadFallbackTasks().filter(t => t.id !== taskId);
    localStorage.setItem("pro_man_fallback_tasks", JSON.stringify(tasks));
  }

  private loadFallbackArchivedTasks(): Task[] {
    const raw = localStorage.getItem("pro_man_archived_tasks");
    if (!raw) return [];
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  private saveFallbackArchivedTask(task: Task): void {
    const tasks = this.loadFallbackArchivedTasks();
    const idx = tasks.findIndex(t => t.id === task.id);
    if (idx !== -1) {
      tasks[idx] = task;
    } else {
      tasks.push(task);
    }
    localStorage.setItem("pro_man_archived_tasks", JSON.stringify(tasks));
  }

  private deleteFallbackArchivedTask(taskId: string): void {
    const tasks = this.loadFallbackArchivedTasks().filter(t => t.id !== taskId);
    localStorage.setItem("pro_man_archived_tasks", JSON.stringify(tasks));
  }

  private loadFallbackDocs(): DocItem[] {
    const raw = localStorage.getItem("pro_man_fallback_docs");
    if (!raw) return [];
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  private saveFallbackDoc(doc: DocItem): void {
    const docs = this.loadFallbackDocs();
    const idx = docs.findIndex(d => d.id === doc.id);
    if (idx !== -1) {
      docs[idx] = doc;
    } else {
      docs.push(doc);
    }
    localStorage.setItem("pro_man_fallback_docs", JSON.stringify(docs));
  }

  private deleteFallbackDoc(docId: string): void {
    const docs = this.loadFallbackDocs().filter(d => d.id !== docId);
    localStorage.setItem("pro_man_fallback_docs", JSON.stringify(docs));
  }
}
