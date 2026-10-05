import { DocItem } from "../types/doc";

/**
 * Serializes a DocItem to Obsidian-compatible Markdown with YAML frontmatter.
 */
export function docToMarkdown(doc: DocItem): string {
  const lines: string[] = [
    "---",
    `id: ${doc.id}`,
    `type: doc`,
    `clientId: ${doc.clientId || ""}`,
    `projectId: ${doc.projectId || ""}`,
    `title: ${JSON.stringify(doc.title)}`,
    `createdAt: ${doc.createdAt}`,
    `updatedAt: ${doc.updatedAt}`,
  ];

  if (doc.tags && doc.tags.length > 0) {
    lines.push("tags:");
    doc.tags.forEach(t => lines.push(`  - ${t}`));
  } else {
    lines.push("tags: []");
  }

  if (doc.parentDocId) {
    lines.push(`parentDocId: ${doc.parentDocId}`);
  }

  lines.push("---");
  lines.push("");
  lines.push(doc.content.trim());
  return lines.join("\n") + "\n";
}

/**
 * Parses Markdown with YAML frontmatter into a DocItem.
 */
export function markdownToDoc(rawContent: string, fallbackId: string): DocItem {
  const content = rawContent.replace(/\r\n/g, "\n");
  const frontmatterRegex = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/;
  const match = content.match(frontmatterRegex);

  const defaults: DocItem = {
    id: fallbackId,
    clientId: "",
    projectId: "",
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
  const parsedData: Record<string, any> = {};

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    if (trimmed.startsWith("- ") && currentKey) {
      const val = trimmed.slice(2).trim();
      if (!Array.isArray(parsedData[currentKey])) parsedData[currentKey] = [];
      parsedData[currentKey].push(val);
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
        let val: any = rawVal;
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        parsedData[key] = val;
      }
    }
  }

  return {
    id: String(parsedData.id || fallbackId),
    clientId: String(parsedData.clientId || ""),
    projectId: String(parsedData.projectId || ""),
    title: String(parsedData.title || fallbackId),
    content: bodyStr,
    tags: Array.isArray(parsedData.tags) ? parsedData.tags : [],
    parentDocId: parsedData.parentDocId ? String(parsedData.parentDocId) : undefined,
    createdAt: String(parsedData.createdAt || defaults.createdAt),
    updatedAt: String(parsedData.updatedAt || defaults.updatedAt),
  };
}
