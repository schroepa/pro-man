/**
 * Lightweight, safe Zero-Dependency Markdown Renderer
 * Supports headings, bold/italic, task lists, code blocks, bullet points, blockquotes, and links.
 */

function escapeHtml(raw: string): string {
  return raw
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function formatInline(raw: string): string {
  let html = escapeHtml(raw);

  // Inline code first (protect contents)
  html = html.replace(/`([^`]+)`/g, '<code class="md-inline-code">$1</code>');

  // Bold / italic / strike
  html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  html = html.replace(/~~([^~]+)~~/g, "<del>$1</del>");

  // Links [text](url) — http(s) or same-origin absolute paths
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_m, text: string, href: string) => {
    const safe = href.trim();
    if (/^https?:\/\//i.test(safe)) {
      return `<a href="${safe}" target="_blank" rel="noopener noreferrer" class="md-link">${text}</a>`;
    }
    if (safe.startsWith("/") && !safe.startsWith("//")) {
      return `<a href="${safe}" class="md-link">${text}</a>`;
    }
    return text;
  });

  // Wikilinks [[Title]]
  html = html.replace(/\[\[([^\]]+)\]\]/g, (_match, title: string) => {
    return `<span class="md-wikilink" data-wiki-title="${title}" role="link" tabindex="0">${title}</span>`;
  });

  return html;
}

/** Full formatting fixture for visual/QA coverage of the description field. */
export const MARKDOWN_FORMAT_FIXTURE = `Absatz mit **fett**, *kursiv*, ~~durchgestrichen~~ und \`inline code\`.

# Große Überschrift

## Unterüberschrift

### Kleine Überschrift

> Zitat-Block für Hinweise und Randnotizen.

- Erster Listenpunkt
- Zweiter Listenpunkt mit [Link](https://example.com)
- Dritter Listenpunkt

- [ ] Offene Checkliste
- [x] Erledigte Checkliste

\`\`\`
function hello() {
  return "code block";
}
\`\`\`

Wikilink: [[Beispiel-Doc]]

Ende des Format-Tests.
`;

/**
 * Strips markdown syntax for plain-text previews (e.g. board card snippets).
 * Keeps readable content; removes headings, lists, emphasis, links, fences.
 */
export function markdownToPlainText(raw: string): string {
  if (!raw) return "";

  let text = raw.replace(/\r\n/g, "\n");

  // Fenced code: keep inner content, drop fences
  text = text.replace(/```[\w]*\n?([\s\S]*?)```/g, "$1");

  const lines = text.split("\n").map((line) => {
    line = line.replace(/^#{1,6}\s+/, "");
    line = line.replace(/^>\s?/, "");
    line = line.replace(/^- \[[x ]\]\s+/i, "");
    line = line.replace(/^\s*[-*]\s+/, "");
    line = line.replace(/^\s*\d+\.\s+/, "");
    return line;
  });

  text = lines.join(" ");

  text = text.replace(/`([^`]+)`/g, "$1");
  text = text.replace(/\*\*([^*]+)\*\*/g, "$1");
  text = text.replace(/\*([^*]+)\*/g, "$1");
  text = text.replace(/~~([^~]+)~~/g, "$1");
  text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
  text = text.replace(/\[\[([^\]]+)\]\]/g, "$1");

  return text.replace(/\s+/g, " ").trim();
}

/**
 * Converts Markdown to safe HTML. Block elements are never nested inside <p>,
 * and bullet lines are wrapped in <ul> so markers stay inside the field.
 */
export function renderMarkdown(raw: string): string {
  if (!raw) return "";

  const lines = raw.replace(/\r\n/g, "\n").split("\n");
  const out: string[] = [];
  let i = 0;
  let inCode = false;
  let codeBuf: string[] = [];

  const flushList = (items: string[]) => {
    if (!items.length) return;
    out.push('<ul class="md-list">');
    for (const item of items) {
      out.push(`<li class="md-bullet-item">${formatInline(item)}</li>`);
    }
    out.push("</ul>");
  };

  const flushParagraph = (buf: string[]) => {
    if (!buf.length) return;
    const text = buf.join("\n").trim();
    if (!text) {
      buf.length = 0;
      return;
    }
    out.push(`<p class="md-paragraph">${formatInline(text).replace(/\n/g, "<br />")}</p>`);
    buf.length = 0;
  };

  let paraBuf: string[] = [];
  let listBuf: string[] = [];

  const endList = () => {
    flushList(listBuf);
    listBuf = [];
  };

  while (i < lines.length) {
    const line = lines[i];

    // Fenced code blocks
    if (line.trimStart().startsWith("```")) {
      if (inCode) {
        out.push(`<pre class="md-code-block"><code>${escapeHtml(codeBuf.join("\n"))}</code></pre>`);
        codeBuf = [];
        inCode = false;
      } else {
        endList();
        flushParagraph(paraBuf);
        inCode = true;
      }
      i++;
      continue;
    }
    if (inCode) {
      codeBuf.push(line);
      i++;
      continue;
    }

    // Blank line → break paragraph / list
    if (!line.trim()) {
      endList();
      flushParagraph(paraBuf);
      i++;
      continue;
    }

    // Headings
    const h3 = line.match(/^###\s+(.+)$/);
    const h2 = line.match(/^##\s+(.+)$/);
    const h1 = line.match(/^#\s+(.+)$/);
    if (h3 || h2 || h1) {
      endList();
      flushParagraph(paraBuf);
      if (h3) out.push(`<h4 class="md-h3">${formatInline(h3[1])}</h4>`);
      else if (h2) out.push(`<h3 class="md-h2">${formatInline(h2[1])}</h3>`);
      else if (h1) out.push(`<h2 class="md-h1">${formatInline(h1[1])}</h2>`);
      i++;
      continue;
    }

    // Blockquote
    const bq = line.match(/^>\s?(.*)$/);
    if (bq) {
      endList();
      flushParagraph(paraBuf);
      out.push(`<blockquote class="md-blockquote">${formatInline(bq[1])}</blockquote>`);
      i++;
      continue;
    }

    // Task list
    const taskDone = line.match(/^- \[x\]\s+(.*)$/i);
    const taskOpen = line.match(/^- \[ \]\s+(.*)$/);
    if (taskDone || taskOpen) {
      endList();
      flushParagraph(paraBuf);
      if (taskDone) {
        out.push(
          `<div class="md-task-item md-task-checked"><span class="md-checkbox-icon" aria-hidden="true">✓</span><span>${formatInline(taskDone[1])}</span></div>`
        );
      } else {
        out.push(
          `<div class="md-task-item"><span class="md-checkbox-icon" aria-hidden="true">○</span><span>${formatInline(taskOpen![1])}</span></div>`
        );
      }
      i++;
      continue;
    }

    // Bullet list
    const bullet = line.match(/^\s*[-*]\s+(.*)$/);
    if (bullet) {
      flushParagraph(paraBuf);
      listBuf.push(bullet[1]);
      i++;
      continue;
    }

    // Normal paragraph line
    endList();
    paraBuf.push(line);
    i++;
  }

  if (inCode) {
    out.push(`<pre class="md-code-block"><code>${escapeHtml(codeBuf.join("\n"))}</code></pre>`);
  }
  endList();
  flushParagraph(paraBuf);

  return `<div class="markdown-rendered-content">${out.join("\n")}</div>`;
}
