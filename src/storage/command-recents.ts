const RECENTS_KEY = "proman_cmd_recents";
const MAX_RECENTS = 8;

export type CommandRecentKind = "task" | "doc";

export interface CommandRecent {
  kind: CommandRecentKind;
  id: string;
}

export function getCommandRecents(): CommandRecent[] {
  try {
    const raw = localStorage.getItem(RECENTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (e): e is CommandRecent =>
          !!e &&
          (e.kind === "task" || e.kind === "doc") &&
          typeof e.id === "string" &&
          e.id.length > 0
      )
      .slice(0, MAX_RECENTS);
  } catch {
    return [];
  }
}

export function pushCommandRecent(entry: CommandRecent): void {
  if (!entry.id) return;
  try {
    const prev = getCommandRecents().filter(
      e => !(e.kind === entry.kind && e.id === entry.id)
    );
    const next = [entry, ...prev].slice(0, MAX_RECENTS);
    localStorage.setItem(RECENTS_KEY, JSON.stringify(next));
  } catch {
    /* private mode */
  }
}

/** Test helper */
export function clearCommandRecents(): void {
  try {
    localStorage.removeItem(RECENTS_KEY);
  } catch {
    /* ignore */
  }
}
