/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect } from "vitest";
import { renderMarkdown, markdownToPlainText, MARKDOWN_FORMAT_FIXTURE } from "./markdown";
import { readSrc } from "../test/helpers";

describe("markdownToPlainText", () => {
  it("strips heading markers from board-style snippets", () => {
    const plain = markdownToPlainText(
      "### Weitere Projekte (Notion)\n- SWT Endkunden-App\n- SWT-Webportal"
    );
    expect(plain).not.toContain("###");
    expect(plain).not.toMatch(/(^|\s)-\s/);
    expect(plain).toContain("Weitere Projekte (Notion)");
    expect(plain).toContain("SWT Endkunden-App");
    expect(plain).toContain("SWT-Webportal");
  });

  it("strips inline formatting markers", () => {
    const plain = markdownToPlainText("Text mit **fett**, *kursiv*, ~~strike~~ und `code`.");
    expect(plain).toBe("Text mit fett, kursiv, strike und code.");
  });

  it("keeps link and wikilink labels only", () => {
    expect(markdownToPlainText("Siehe [Docs](https://example.com) und [[Plan]]")).toBe(
      "Siehe Docs und Plan"
    );
  });
});

describe("renderMarkdown", () => {
  it("wraps consecutive bullets in a ul (never orphan li)", () => {
    const html = renderMarkdown("- Eins\n- Zwei\n- Drei");
    expect(html).toContain('<ul class="md-list">');
    expect(html).toContain('<li class="md-bullet-item">Eins</li>');
    expect(html).toContain('<li class="md-bullet-item">Drei</li>');
    expect(html).toContain("</ul>");
    // Orphan li before ul must not appear
    expect(html.replace(/<ul[\s\S]*?<\/ul>/g, "")).not.toContain("<li");
  });

  it("does not nest block elements inside paragraphs", () => {
    const html = renderMarkdown("# Titel\n\nAbsatz\n\n- Item");
    expect(html).toContain('<h2 class="md-h1">');
    expect(html).toContain('<p class="md-paragraph">Absatz</p>');
    expect(html).toContain('<ul class="md-list">');
    const root = document.createElement("div");
    root.innerHTML = html;
    expect(root.querySelector("p h2, p ul, p li")).toBeNull();
    expect(root.querySelectorAll("ul.md-list").length).toBe(1);
  });

  it("renders the full format fixture with every supported feature", () => {
    const html = renderMarkdown(MARKDOWN_FORMAT_FIXTURE);
    expect(html).toContain('class="md-h1"');
    expect(html).toContain('class="md-h2"');
    expect(html).toContain('class="md-h3"');
    expect(html).toContain("<strong>fett</strong>");
    expect(html).toContain("<em>kursiv</em>");
    expect(html).toContain("<del>durchgestrichen</del>");
    expect(html).toContain('class="md-inline-code"');
    expect(html).toContain('class="md-blockquote"');
    expect(html).toContain('class="md-list"');
    expect(html).toContain('class="md-link"');
    expect(html).toContain('href="https://example.com"');
    expect(html).toContain("md-task-item");
    expect(html).toContain("md-task-checked");
    expect(html).toContain('class="md-code-block"');
    expect(html).toContain('class="md-wikilink"');
  });

  it("escapes raw HTML in source", () => {
    const html = renderMarkdown('<script>alert(1)</script>\n\n**ok**');
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("<strong>ok</strong>");
  });
});

describe("markdown description CSS containment", () => {
  it("keeps list markers inside the padded field", () => {
    const css = readSrc("styles/components/dialog.css");
    expect(css).toMatch(/\.md-live-view\s*\{[\s\S]*?overflow:\s*hidden/);
    expect(css).toMatch(/\.md-list[\s\S]*?padding-left:\s*1\.25em/);
    expect(css).toMatch(/list-style-position:\s*outside/);
  });
});
