import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { Task } from "../types/task";
import type { Client, Project } from "../types/client";
import { store } from "../storage/store";

const HERE = dirname(fileURLToPath(import.meta.url));
export const ROOT = join(HERE, "../..");
export const SRC = join(ROOT, "src");

export function readSrc(relPath: string): string {
  return readFileSync(join(SRC, relPath), "utf8");
}

export function walkFiles(dir: string, exts: string[]): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) {
      if (name === "node_modules" || name === "dist" || name === "test") continue;
      out.push(...walkFiles(full, exts));
    } else if (exts.some(ext => name.endsWith(ext))) {
      out.push(full);
    }
  }
  return out;
}

export function makeTask(overrides: Partial<Task> = {}): Task {
  const today = "2026-10-05";
  return {
    id: "TASK-1",
    title: "Test task",
    description: "",
    status: "todo",
    priority: "normal",
    startDate: today,
    dueDate: today,
    tags: [],
    dependencies: [],
    subtasks: [],
    order: 0,
    createdAt: "2026-10-05T10:00:00.000Z",
    updatedAt: "2026-10-05T10:00:00.000Z",
    ...overrides,
  };
}

type StoreMaps = {
  tasks: Map<string, Task>;
  clients: Map<string, Client>;
  projects: Map<string, Project>;
  storage: { saveTask: (task: Task) => Promise<void> };
};

export function storeInternals(): StoreMaps {
  return store as unknown as StoreMaps;
}

export function resetStoreMaps(): void {
  const s = storeInternals();
  s.tasks.clear();
  s.clients.clear();
  s.projects.clear();
  store.clearFilters();
  store.currentView = "kanban";
  // clearFilters schedules a coalesced notify — flush so later tests see a clean rAF queue
  store.notifySync();
}

export function seedClientProject(opts?: {
  clientCode?: string;
  projectCode?: string;
}): { clientId: string; projectId: string } {
  const clientId = "cli-acme";
  const projectId = "prj-web";
  const s = storeInternals();
  s.clients.set(clientId, {
    id: clientId,
    name: "Acme Corp",
    color: "#c25e1a",
    code: opts?.clientCode ?? "ACM",
  });
  s.projects.set(projectId, {
    id: projectId,
    clientId,
    name: "Web Redesign",
    code: opts?.projectCode ?? "WEB",
    color: "#2563eb",
  });
  return { clientId, projectId };
}

export function stubVaultWrites(): void {
  const s = storeInternals();
  s.storage.saveTask = async () => {};
}

export function cssVarBlock(css: string, selector: string): string {
  const re = new RegExp(`${selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*\\{([\\s\\S]*?)\\n\\}`, "m");
  const m = css.match(re);
  return m?.[1] ?? "";
}

export function extractCssVar(block: string, name: string): string | null {
  const re = new RegExp(`${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*:\\s*([^;]+);`);
  const m = block.match(re);
  return m?.[1]?.trim() ?? null;
}

/** Relative luminance for sRGB hex (#rgb / #rrggbb). */
export function relativeLuminance(hex: string): number {
  const raw = hex.replace("#", "").trim();
  const full = raw.length === 3
    ? raw.split("").map(c => c + c).join("")
    : raw;
  const r = parseInt(full.slice(0, 2), 16) / 255;
  const g = parseInt(full.slice(2, 4), 16) / 255;
  const b = parseInt(full.slice(4, 6), 16) / 255;
  const lin = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

export function contrastRatio(fg: string, bg: string): number {
  const L1 = relativeLuminance(fg);
  const L2 = relativeLuminance(bg);
  const lighter = Math.max(L1, L2);
  const darker = Math.min(L1, L2);
  return (lighter + 0.05) / (darker + 0.05);
}

export function relPath(abs: string): string {
  return relative(ROOT, abs);
}
