/*
 * The little Markdown Bee writes (paragraphs, lists, code, bold, links),
 * rendered to HTML. Everything is escaped first, so a model answer can never
 * inject markup; only links to these docs or to https pages survive.
 * It tolerates half-streamed input: an open fence renders as code so far.
 */

const escape = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function inline(text: string): string {
  const code: string[] = [];
  let out = escape(text).replace(/`([^`]+)`/g, (_, c: string) => `\u0000${code.push(c) - 1}\u0000`);
  out = out
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\[((?:[^[\]]|\[[^\]]*\])+)\]\(([^)\s]+)\)/g, (_, label: string, href: string) => {
      if (/^(\/|#)/.test(href)) return `<a href="${href}">${label}</a>`;
      if (/^https:\/\//.test(href)) return `<a href="${href}" target="_blank" rel="noopener noreferrer">${label}</a>`;
      return label;
    });
  return out.replace(/\u0000(\d+)\u0000/g, (_, i: string) => `<code>${code[Number(i)]}</code>`);
}

function blocks(text: string): string {
  const out: string[] = [];
  let para: string[] = [];
  let list = null as { tag: "ul" | "ol"; items: string[] } | null;
  const flushPara = () => {
    if (para.length) out.push(`<p>${para.map(inline).join("<br>")}</p>`);
    para = [];
  };
  const flushList = () => {
    if (list) out.push(`<${list.tag}>${list.items.map((i) => `<li>${inline(i)}</li>`).join("")}</${list.tag}>`);
    list = null;
  };

  for (const line of text.split("\n")) {
    const item = line.match(/^\s*([-*]|\d+[.)])\s+(.*)$/);
    const heading = line.match(/^#{1,6}\s+(.*)$/);
    if (!line.trim()) {
      flushPara();
      flushList();
    } else if (item) {
      flushPara();
      const tag = /\d/.test(item[1]) ? "ol" : "ul";
      if (list?.tag !== tag) {
        flushList();
        list = { tag, items: [] };
      }
      list!.items.push(item[2]);
    } else if (heading) {
      flushPara();
      flushList();
      out.push(`<p><strong>${inline(heading[1])}</strong></p>`);
    } else if (list && /^\s+/.test(line)) {
      list.items[list.items.length - 1] += ` ${line.trim()}`;
    } else {
      flushList();
      para.push(line);
    }
  }
  flushPara();
  flushList();
  return out.join("");
}

export function renderMarkdown(markdown: string): string {
  let html = "";
  let rest = markdown;
  for (;;) {
    const open = rest.match(/^```([\w-]*)[^\n]*(?:\n|$)/m);
    if (!open) return html + blocks(rest);
    html += blocks(rest.slice(0, open.index));
    rest = rest.slice(open.index! + open[0].length);
    const close = rest.match(/^```[ \t]*$/m);
    const code = close ? rest.slice(0, close.index) : rest;
    const lang = open[1] ? ` data-lang="${escape(open[1])}"` : "";
    html += `<pre${lang}><code>${escape(code.replace(/\n$/, ""))}</code></pre>`;
    if (!close) return html;
    rest = rest.slice(close.index! + close[0].length);
  }
}
