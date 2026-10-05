/**
 * Lightweight, safe Zero-Dependency Markdown Renderer
 * Supports headings, bold/italic, task lists, code blocks, bullet points, blockquotes, and links.
 */
export function renderMarkdown(raw: string): string {
  if (!raw) return "";

  // 1. Escape HTML
  let html = raw
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // 2. Code blocks (```code```)
  html = html.replace(/```([a-zA-Z0-9]*)\n([\s\S]*?)```/g, (_match, _lang, code) => {
    return `<pre class="md-code-block"><code>${code.trim()}</code></pre>`;
  });

  // 3. Inline code
  html = html.replace(/`([^`]+)`/g, '<code class="md-inline-code">$1</code>');

  // 4. Headings
  html = html.replace(/^### (.*$)/gim, '<h4 class="md-h3">$1</h4>');
  html = html.replace(/^## (.*$)/gim, '<h3 class="md-h2">$1</h3>');
  html = html.replace(/^# (.*$)/gim, '<h2 class="md-h1">$1</h2>');

  // 5. Blockquotes
  html = html.replace(/^\> (.*$)/gim, '<blockquote class="md-blockquote">$1</blockquote>');

  // 6. Task lists / Checklists
  html = html.replace(/^- \[x\] (.*$)/gim, '<div class="md-task-item md-task-checked"><span class="md-checkbox-icon">✓</span> <s>$1</s></div>');
  html = html.replace(/^- \[ \] (.*$)/gim, '<div class="md-task-item"><span class="md-checkbox-icon">○</span> $1</div>');

  // 7. Bullet lists (- or *)
  html = html.replace(/^\s*[-*]\s+(.*$)/gim, '<li class="md-bullet-item">$1</li>');

  // 8. Bold & Italic
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  html = html.replace(/~~([^~]+)~~/g, '<del>$1</del>');

  // 9. Links [text](url)
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="md-link">$1</a>');

  // 9b. Wikilinks [[Title]]
  html = html.replace(/\[\[([^\]]+)\]\]/g, (_match, title: string) => {
    return `<span class="md-wikilink" data-wiki-title="${title}" role="link" tabindex="0">${title}</span>`;
  });

  // 10. Paragraphs / Linebreaks
  html = html.replace(/\n\n+/g, '</p><p class="md-paragraph">');
  html = html.replace(/\n/g, '<br />');

  return `<div class="markdown-rendered-content"><p class="md-paragraph">${html}</p></div>`;
}
