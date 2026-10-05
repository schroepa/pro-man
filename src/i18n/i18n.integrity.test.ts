import { describe, it, expect } from "vitest";
import { translations } from "./index";

function flattenKeys(obj: unknown, prefix = ""): string[] {
  if (obj === null || typeof obj !== "object") return [prefix];
  return Object.entries(obj as Record<string, unknown>).flatMap(([k, v]) => {
    const path = prefix ? `${prefix}.${k}` : k;
    if (v !== null && typeof v === "object" && !Array.isArray(v)) {
      return flattenKeys(v, path);
    }
    return [path];
  });
}

describe("i18n integrity", () => {
  it("German and English catalogs expose the same key tree", () => {
    const deKeys = flattenKeys(translations.de).sort();
    const enKeys = flattenKeys(translations.en).sort();
    expect(enKeys).toEqual(deKeys);
  });

  it("critical UX strings are non-empty in both locales", () => {
    for (const catalog of [translations.de, translations.en]) {
      expect(catalog.announcements.subtasksBlockDone.length).toBeGreaterThan(5);
      expect(catalog.tasks.noAssignee.length).toBeGreaterThan(1);
      expect(catalog.actions.save.length).toBeGreaterThan(1);
      expect(catalog.filters.more.length).toBeGreaterThan(1);
    }
  });
});
