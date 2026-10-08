import { KnowledgeItem, isKnowledgeCategory } from "../types/knowledge";

/**
 * Serializes a KnowledgeItem to Obsidian-compatible Markdown with YAML frontmatter.
 */
export function knowledgeToMarkdown(item: KnowledgeItem): string {
  const lines: string[] = [
    "---",
    `id: ${item.id}`,
    `type: knowledge`,
    `clientId: ${item.clientId || ""}`,
  ];

  if (item.projectId) {
    lines.push(`projectId: ${item.projectId}`);
  }

  lines.push(`category: ${item.category}`);
  lines.push(`title: ${JSON.stringify(item.title)}`);
  lines.push(`createdAt: ${item.createdAt}`);
  lines.push(`updatedAt: ${item.updatedAt}`);

  if (item.tags && item.tags.length > 0) {
    lines.push("tags:");
    item.tags.forEach(t => lines.push(`  - ${t}`));
  } else {
    lines.push("tags: []");
  }

  lines.push("---");
  lines.push("");
  lines.push(item.content.trim());
  return lines.join("\n") + "\n";
}

/**
 * Parses Markdown with YAML frontmatter into a KnowledgeItem.
 */
export function markdownToKnowledge(rawContent: string, fallbackId: string): KnowledgeItem {
  const content = rawContent.replace(/\r\n/g, "\n");
  const frontmatterRegex = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/;
  const match = content.match(frontmatterRegex);

  const defaults: KnowledgeItem = {
    id: fallbackId,
    clientId: "",
    projectId: undefined,
    category: "other",
    title: fallbackId,
    content: "",
    tags: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  if (!match) {
    defaults.content = content.trim();
    return defaults;
  }

  const frontmatterStr = match[1];
  const bodyStr = (match[2] || "").trim();
  const lines = frontmatterStr.split("\n");
  let currentKey = "";
  const parsedData: Record<string, unknown> = {};

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    if (trimmed.startsWith("- ") && currentKey) {
      const val = trimmed.slice(2).trim();
      if (!Array.isArray(parsedData[currentKey])) parsedData[currentKey] = [];
      (parsedData[currentKey] as string[]).push(val);
      continue;
    }

    const colonIdx = line.indexOf(":");
    if (colonIdx !== -1) {
      const key = line.slice(0, colonIdx).trim();
      const rawVal = line.slice(colonIdx + 1).trim();

      if (rawVal === "" || rawVal === "[]") {
        currentKey = key;
        parsedData[key] = [];
      } else {
        currentKey = key;
        let val: unknown = rawVal;
        if (
          typeof val === "string" &&
          ((val.startsWith('"') && val.endsWith('"')) ||
            (val.startsWith("'") && val.endsWith("'")))
        ) {
          val = val.slice(1, -1);
        }
        parsedData[key] = val;
      }
    }
  }

  const rawCategory = String(parsedData.category || "other");
  const category = isKnowledgeCategory(rawCategory) ? rawCategory : "other";

  const rawProjectId = parsedData.projectId ? String(parsedData.projectId) : "";
  const projectId = rawProjectId ? rawProjectId : undefined;

  return {
    id: String(parsedData.id || fallbackId),
    clientId: String(parsedData.clientId || ""),
    projectId,
    category,
    title: String(parsedData.title || fallbackId),
    content: bodyStr,
    tags: Array.isArray(parsedData.tags) ? (parsedData.tags as string[]) : [],
    createdAt: String(parsedData.createdAt || defaults.createdAt),
    updatedAt: String(parsedData.updatedAt || defaults.updatedAt),
  };
}
