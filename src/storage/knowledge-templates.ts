import type { KnowledgeCategory } from "../types/knowledge";

type KnowledgeLocale = "de" | "en";

const SECTIONS: Record<KnowledgeLocale, Record<KnowledgeCategory, readonly string[]>> = {
  de: {
    colors: ["Palette", "Verwendung", "Do / Don\u2019t"],
    typography: ["Schriftarten", "Hierarchie", "Verwendung"],
    "design-system": ["Prinzipien", "Komponenten", "Tokens"],
    "blocks-sections": ["Muster", "Varianten", "Notizen"],
    "screens-views": ["Übersicht", "Abläufe", "Notizen"],
    "mission-vision": ["Mission", "Vision", "Prinzipien"],
    logic: ["Regeln", "Grenzfälle", "Notizen"],
    other: ["Zusammenfassung", "Details"],
  },
  en: {
    colors: ["Palette", "Usage", "Do / Don\u2019t"],
    typography: ["Fonts", "Hierarchy", "Usage"],
    "design-system": ["Principles", "Components", "Tokens"],
    "blocks-sections": ["Patterns", "Variants", "Notes"],
    "screens-views": ["Overview", "Flows", "Notes"],
    "mission-vision": ["Mission", "Vision", "Principles"],
    logic: ["Rules", "Edge cases", "Notes"],
    other: ["Summary", "Details"],
  },
};

function sectionsToMarkdown(titles: readonly string[]): string {
  return titles.map((title) => `## ${title}\n\n`).join("");
}

export function knowledgeTemplate(
  category: KnowledgeCategory,
  locale: KnowledgeLocale,
): string {
  return sectionsToMarkdown(SECTIONS[locale][category]);
}
