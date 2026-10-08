export type KnowledgeCategory =
  | "colors"
  | "typography"
  | "design-system"
  | "blocks-sections"
  | "screens-views"
  | "mission-vision"
  | "logic"
  | "other";

export const KNOWLEDGE_CATEGORIES: readonly KnowledgeCategory[] = [
  "colors",
  "typography",
  "design-system",
  "blocks-sections",
  "screens-views",
  "mission-vision",
  "logic",
  "other",
];

export interface KnowledgeItem {
  id: string;
  clientId: string;
  projectId?: string;
  category: KnowledgeCategory;
  title: string;
  content: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface KnowledgeListEntry {
  item: KnowledgeItem;
  readOnly: boolean;
}

export function isKnowledgeCategory(value: string): value is KnowledgeCategory {
  return (KNOWLEDGE_CATEGORIES as readonly string[]).includes(value);
}
