/**
 * Draws a Session as hive's compositor does: sidebar, tab bar, bordered
 * panes, boxes and toasts, cell for cell (compare internal/tui/mux's
 * golden screens).
 */
import { Grid, pad, truncate, width, type Span, type Style } from "./grid";
import * as layout from "./layout";
import type { Line } from "./programs";
import { ACTION_HELP, KEYS, display, type Proc, type Session, type ToastKind } from "./session";
import type { Theme } from "./theme";

/** At or below this width the sidebar fills the screen (compositor.MobileWidth). */
export const MOBILE_WIDTH = 64;
export const SIDEBAR_WIDTH = 28;

export function render(s: Session, cols: number, rows: number, th: Theme): Grid {
  const g = new Grid(cols, rows, th.term);
  if (s.detached) {
    drawOuter(g, s, th);
    return g;
  }
  const overview = s.overlay?.kind === "overview";
  const sw = s.sidebar && !overview ? SIDEBAR_WIDTH : 0;
  if (sw && (cols <= MOBILE_WIDTH || sw >= cols - 10)) {
    drawSidebar(g, s, th, cols);
    return g;
  }
  if (sw) {
    drawSidebar(g, s, th, sw);
    for (let y = 0; y < rows; y++) g.set(sw, y, "│", { fg: th.border, bg: th.bg });
  }
  const x0 = sw ? sw + 1 : 0;
  drawTabBar(g, s, th, x0, cols - x0);
  if (!overview) drawPanes(g, s, th, { x: x0, y: 1, w: cols - x0, h: rows - 1 });
  if (s.overlay) drawOverlay(g, s, th);
  drawToasts(g, s, th);
  return g;
}

/** Program output in the theme's terminal colours. */
function drawLine(g: Grid, x: number, y: number, w: number, line: Line, th: Theme, faint = false) {
  let cx = x;
  for (const seg of line) {
    if (cx >= x + w) break;
    cx = g.text(cx, y, x + w - cx, seg.t, { fg: th.ansi[seg.c ?? "fg"], bold: seg.b, faint });
  }
}

// --- glyphs ---

function envGlyph(s: Session, env: string, th: Theme): [string, string] {
  const procs = s.procsIn(env);
  if (procs.some((p) => p.prog.status === "running" && p.prog.state === "blocked")) return ["◆", th.warning];
  const running = procs.filter((p) => p.prog.status === "running").length;
  const failed = procs.filter((p) => p.prog.status === "exited" && p.prog.exitCode !== 0).length;
  if (failed > 0 && running === 0) return ["●", th.error];
  if (running > 0) return ["●", th.success];
  return ["○", th.muted];
}

function statusGlyph(s: Session, p: Proc, th: Theme): [string, string] {
  if (p.prog.status === "running" && s.isAgent(p)) {
    switch (p.prog.state) {
      case "working":
        return ["●", th.info];
      case "blocked":
        return ["◆", th.warning];
      case "done":
        return ["✓", th.success];
      case "idle":
        return ["○", th.fg];
    }
  }
  if (p.prog.status === "running") return ["●", th.success];
  if (p.prog.exitCode !== 0) return ["✗", th.error];
  return ["○", th.muted];
}

// --- sidebar ---

function drawSidebar(g: Grid, s: Session, th: Theme, w: number) {
  const bar: Style = { fg: th.fg, bg: th.bg };
  g.fill(0, 0, w, g.h, bar);
  const muted: Style = { fg: th.muted };
  let y = 0;
  const row = (spans: Span[], base: Style, hit?: { kind: "env" | "agent" | "header"; id: string }, selected = false) => {
    if (y >= g.h) return;
    if (selected) g.fill(0, y, w, 1, base);
    g.spans(1, y, w - 2, spans, base);
    if (hit) g.hit({ x: 0, y, w, h: 1, kind: hit.kind, id: hit.id });
    y++;
  };
  const header = (id: string, title: string, n: number) =>
    row([{ t: `${s.collapsed.has(id) ? "▸" : "▾"} ${title}` }, { t: ` ${n}`, st: muted }], { fg: th.muted, bg: th.bg, bold: true }, { kind: "header", id });
  const selected: Style = { fg: th.fg, bg: th.selection, bold: true };

  header("environments", "Environments", s.envs.length);
  if (!s.collapsed.has("environments")) {
    for (const e of s.envs) {
      const [glyph, c] = envGlyph(s, e.id, th);
      const spans: Span[] = [{ t: `${glyph} `, st: { fg: c } }, { t: e.id }];
      if (e.id !== s.envId && s.tabsOf(e.id).some((t) => t.activity)) spans.push({ t: " •", st: { fg: th.accent } });
      spans.push({ t: `  ${e.git}`, st: muted });
      const on = e.id === s.envId;
      row(spans, on ? selected : bar, { kind: "env", id: e.id }, on);
    }
  }
  y++;
  const procs = s.procsIn(s.envId);
  header("agents", "Agents", procs.length);
  if (!s.collapsed.has("agents")) {
    const focused = s.procOf(s.focusedPane());
    for (const p of procs) {
      const [glyph, c] = statusGlyph(s, p, th);
      const on = p === focused;
      row([{ t: `${glyph} `, st: { fg: c } }, { t: s.name(p) }], on ? selected : bar, { kind: "agent", id: p.id }, on);
    }
    if (procs.length === 0) row([{ t: "  none yet", st: muted }], bar);
  }
}

// --- tab bar ---

function modeBadge(s: Session, th: Theme): Span[] {
  const badge = (t: string, c: string): Span[] => [{ t: ` ${t} `, st: { fg: th.bg, bg: c, bold: true } }];
  if (s.overlay?.kind === "overview") return badge("OVERVIEW", th.info);
  switch (s.mode) {
    case "prefix":
      return badge("PREFIX", th.accent);
    case "navigate":
      return badge("NAVIGATE", th.info);
    case "resize":
      return badge("RESIZE", th.warning);
  }
  return [{ t: "C-b ? help", st: { fg: th.muted } }];
}

function drawTabBar(g: Grid, s: Session, th: Theme, x0: number, w: number) {
  const bar: Style = { fg: th.fg, bg: th.bg };
  g.fill(x0, 0, w, 1, bar);
  let end = x0 + w;
  const right = modeBadge(s, th);
  const rw = right.reduce((n, sp) => n + width(sp.t), 0);
  if (rw > 0 && rw < w / 2) {
    end -= rw + 1;
    g.spans(end + 1, 0, rw, right, bar);
  }
  let x = x0 + 1;
  const env = s.env();
  if (env) {
    x = g.text(x, 0, end - x, env.id, { ...bar, bold: true });
    x = g.text(x, 0, end - x, ` ${env.git}`, { fg: th.muted, bg: th.bg });
    x = g.text(x, 0, end - x, " │", { fg: th.border, bg: th.bg });
  }
  const active = s.tab();
  s.tabsOf().forEach((t, i) => {
    if (x >= end) return;
    const on = t === active;
    const label = t.activity && !on ? ` ${i + 1} ${t.name}• ` : ` ${i + 1} ${t.name} `;
    const st: Style = on ? { fg: th.accent, bg: th.bg, bold: true, underline: true } : { fg: th.muted, bg: th.bg };
    const x1 = x;
    x = g.text(x, 0, end - x, label, st);
    g.hit({ x: x1, y: 0, w: x - x1, h: 1, kind: "tab", id: t.id });
  });
  if (x + 3 <= end) {
    g.text(x, 0, 3, " + ", { fg: th.muted, bg: th.bg });
    g.hit({ x, y: 0, w: 3, h: 1, kind: "newtab" });
  }
}

// --- panes ---

const L = 1;
const R = 2;
const U = 4;
const D = 8;
const BOX: Record<number, string> = {
  [L]: "─", [R]: "─", [L | R]: "─", [U]: "│", [D]: "│", [U | D]: "│",
  [L | R | D]: "┬", [L | R | U]: "┴", [U | D | R]: "├", [U | D | L]: "┤", [L | R | U | D]: "┼",
  [R | D]: "┌", [L | D]: "┐", [R | U]: "└", [L | U]: "┘",
};

function separators(n: layout.Node, r: layout.Rect, out: { x: number; y: number; h: number }[]) {
  if (n.kind === "leaf") return;
  const geo = layout.geometry(n, r);
  const a = layout.panes(n.a).map((id) => geo.get(id)!);
  const b = layout.panes(n.b).map((id) => geo.get(id)!);
  const bound = (rs: layout.Rect[]): layout.Rect => {
    const x = Math.min(...rs.map((q) => q.x));
    const y = Math.min(...rs.map((q) => q.y));
    return { x, y, w: Math.max(...rs.map((q) => q.x + q.w)) - x, h: Math.max(...rs.map((q) => q.y + q.h)) - y };
  };
  const ra = bound(a);
  const rb = bound(b);
  if (n.dir === "right") out.push({ x: ra.x + ra.w, y: r.y, h: r.h });
  separators(n.a, ra, out);
  separators(n.b, rb, out);
}

function drawPanes(g: Grid, s: Session, th: Theme, area: layout.Rect) {
  const t = s.tab();
  if (!t) {
    for (let x = area.x; x < area.x + area.w; x++) g.set(x, area.y, "─", { fg: th.border });
    centre(g, { ...area, y: area.y + 1, h: area.h - 1 }, `No tabs in ${s.envId}\n\nC-b c opens one`, { fg: th.muted });
    s.geo = new Map();
    return;
  }
  const geo = t.zoomed ? new Map([[t.zoomed, area]]) : layout.geometry(t.root, area);
  s.geo = geo;

  // Borders: every pane's top line, and a column between split halves.
  const arms = new Uint8Array(g.w * g.h);
  const accent = new Uint8Array(g.w * g.h);
  const at = (x: number, y: number) => y * g.w + x;
  for (const r of geo.values()) for (let x = r.x; x < r.x + r.w; x++) arms[at(x, r.y)] |= L | R;
  if (!t.zoomed) {
    const seps: { x: number; y: number; h: number }[] = [];
    separators(t.root, area, seps);
    for (const sp of seps) {
      for (let y = sp.y; y < sp.y + sp.h; y++) arms[at(sp.x, y)] |= (y > sp.y ? U : 0) | D;
    }
    for (const sp of seps) {
      for (let y = sp.y; y < sp.y + sp.h; y++) {
        if (sp.x > 0 && arms[at(sp.x - 1, y)] & R && !(arms[at(sp.x - 1, y)] & (U | D))) arms[at(sp.x, y)] |= L;
        if (sp.x + 1 < g.w && arms[at(sp.x + 1, y)] & L && !(arms[at(sp.x + 1, y)] & (U | D))) arms[at(sp.x, y)] |= R;
      }
    }
  }
  const f = geo.get(t.focused);
  if (f) {
    const mark = (x: number, y: number) => {
      if (x >= area.x && x < area.x + area.w && y >= area.y && y < area.y + area.h && arms[at(x, y)]) accent[at(x, y)] = 1;
    };
    for (let x = f.x - 1; x <= f.x + f.w; x++) {
      mark(x, f.y);
      mark(x, f.y + f.h);
    }
    for (let y = f.y; y < f.y + f.h; y++) {
      mark(f.x - 1, y);
      mark(f.x + f.w, y);
    }
  }
  for (let y = area.y; y < area.y + area.h; y++) {
    for (let x = area.x; x < area.x + area.w; x++) {
      const m = arms[at(x, y)];
      if (m) g.set(x, y, BOX[m] ?? "┼", { fg: accent[at(x, y)] ? th.accent : th.border });
    }
  }

  for (const [id, r] of geo) {
    const pane = s.panes.get(id);
    const proc = s.procOf(pane);
    if (!pane) continue;
    const focused = id === t.focused;
    const exited = proc?.prog.status === "exited";
    const ch = r.h - 1;
    g.hit({ x: r.x, y: r.y, w: r.w, h: r.h, kind: "pane", id });

    if (proc && ch > 0) {
      const v = proc.prog.view(r.w, ch);
      v.lines.slice(0, ch).forEach((line, i) => drawLine(g, r.x, r.y + 1 + i, r.w, line, th, exited));
      if (exited && v.lines.length === 0) centre(g, { ...r, y: r.y + 1, h: ch }, `the process exited ${proc.prog.exitCode}\n\nC-b x closes the pane`, { fg: th.muted });
      if (focused && !exited && !s.overlay && v.cursor && v.cursor.y >= 0 && v.cursor.y < ch) g.cursor = { x: r.x + v.cursor.x, y: r.y + 1 + v.cursor.y };
    }

    // Title and badges on the pane's top line.
    if (r.w >= 4) {
      const title = pane.name || proc?.prog.title || id;
      const spans: Span[] = [{ t: ` ${truncate(title, Math.max(1, r.w - 4))} `, st: focused ? { fg: th.accent, bold: true } : { fg: th.muted } }];
      if (t.zoomed === id) spans.push({ t: "[zoom] ", st: { fg: th.accent } });
      if (exited && proc) spans.push({ t: `[exited ${proc.prog.exitCode}] `, st: { fg: proc.prog.exitCode ? th.error : th.muted } });
      g.spans(r.x + 1, r.y, r.w - 2, spans);
    }
  }
}

function centre(g: Grid, r: layout.Rect, text: string, st: Style) {
  const lines = text.split("\n");
  const y0 = r.y + Math.floor((r.h - lines.length) / 2);
  lines.forEach((l, i) => {
    const t = truncate(l, r.w);
    g.text(r.x + Math.floor((r.w - width(t)) / 2), y0 + i, r.w, t, st);
  });
}

// --- boxes ---

interface BoxOpts {
  title: string;
  w: number;
  h: number;
  x?: number;
  y?: number;
}

/** A themed box; returns its inner area. */
function box(g: Grid, th: Theme, o: BoxOpts): layout.Rect {
  const w = Math.min(o.w, g.w);
  const h = Math.min(o.h, g.h);
  const x = o.x ?? Math.floor((g.w - w) / 2);
  const y = o.y ?? Math.max(0, Math.floor((g.h - h) / 2) - 1);
  g.fill(x, y, w, h, { fg: th.fg, bg: th.bg });
  g.box(x, y, w, h, { fg: th.accent, bg: th.bg }, o.title);
  return { x: x + 2, y: y + 1, w: w - 4, h: h - 2 };
}

function drawOverlay(g: Grid, s: Session, th: Theme) {
  const o = s.overlay!;
  const text: Style = { fg: th.fg, bg: th.bg };
  const muted: Style = { fg: th.muted, bg: th.bg };
  const accent: Style = { fg: th.accent, bg: th.bg, bold: true };

  switch (o.kind) {
    case "help": {
      const inner = box(g, th, { title: "Keys", w: Math.min(76, g.w - 4), h: Math.min(26, g.h - 2) });
      g.spans(inner.x, inner.y, inner.w, [{ t: "filter › ", st: accent }, { t: o.filter, st: text }]);
      g.cursor = { x: inner.x + 9 + width(o.filter), y: inner.y };
      const f = o.filter.toLowerCase();
      const rows: Span[][] = [];
      const sections: [string, keyof typeof KEYS][] = [
        ["PREFIX MODE (after C-b)", "prefix"],
        ["NAVIGATE MODE (C-b space)", "navigate"],
        ["RESIZE MODE (C-b r)", "resize"],
      ];
      for (const [title, mode] of sections) {
        const entries = KEYS[mode].filter(([keys, act]) => !f || act.includes(f.replace(/ /g, "_")) || (ACTION_HELP[act] ?? "").includes(f) || keys.some((k) => k === f));
        if (entries.length === 0) continue;
        rows.push([], [{ t: title, st: { ...text, bold: true } }]);
        for (const [keys, act] of entries) rows.push([{ t: pad(keys.map(display).join(" "), 15), st: { fg: th.accent, bg: th.bg } }, { t: ACTION_HELP[act] ?? act, st: text }]);
      }
      if (rows.length === 0) rows.push([], [{ t: "no key matches", st: muted }]);
      const room = inner.h - 2;
      o.scroll = Math.min(o.scroll, Math.max(0, rows.length - room));
      rows.slice(o.scroll, o.scroll + room).forEach((r, i) => g.spans(inner.x, inner.y + 1 + i, inner.w, r, text));
      g.text(inner.x, inner.y + inner.h - 1, inner.w, "type to filter  ↑↓ scroll  esc close", muted);
      return;
    }
    case "overview": {
      const c = s.counts();
      const inner = box(g, th, { title: `Overview · ${c.running} running · ${c.awaiting} awaiting · ${c.complete} complete · ${c.ended} ended`, w: g.w, h: g.h, x: 0, y: 0 });
      inner.x -= 1;
      inner.w += 2;
      const all = s.allProcs();
      o.sel = Math.min(o.sel, Math.max(0, all.length - 1));
      const pw = g.w >= 90 ? Math.floor(inner.w * 0.4) : 0;
      const tw = inner.w - (pw ? pw + 1 : 0);
      const nameW = Math.max(8, Math.min(22, tw - 34));
      const envW = 15;
      g.text(inner.x, inner.y, tw, `   ${pad("AGENT", nameW + 1)}${pad("ENVIRONMENT", envW)}STATUS`, { ...muted, bold: true });
      all.forEach((p, i) => {
        const y = inner.y + 1 + i;
        if (y >= inner.y + inner.h - 1) return;
        const on = i === o.sel;
        const base: Style = on ? { fg: th.fg, bg: th.selection, bold: true } : text;
        if (on) g.fill(inner.x, y, tw, 1, base);
        const [glyph, gc] = statusGlyph(s, p, th);
        g.spans(inner.x, y, tw, [{ t: ` ${glyph} `, st: { fg: gc } }, { t: pad(s.name(p), nameW + 1) }, { t: pad(p.env, envW) }, { t: `${s.statusText(p)} ${s.elapsed(p)}` }], base);
        g.hit({ x: inner.x, y, w: tw, h: 1, kind: "overview-row", id: String(i) });
      });
      if (pw) {
        const sx = inner.x + tw;
        for (let y = inner.y; y < inner.y + inner.h - 1; y++) g.set(sx, y, "│", { fg: th.border, bg: th.bg });
        const p = all[o.sel];
        if (p) {
          const v = p.prog.view(pw, inner.h - 1);
          v.lines.slice(0, inner.h - 1).forEach((line, i) => drawLine(g, sx + 1, inner.y + i, pw, line, th));
        }
      }
      g.text(inner.x + 1, inner.y + inner.h - 1, inner.w - 1, "↑↓ select  ⏎ go to pane  x stop  esc close", muted);
      return;
    }
    case "picker": {
      const items = s.pickerItems(o.filter);
      const inner = box(g, th, { title: "Go to", w: Math.min(80, g.w - 6), h: Math.min(Math.max(8, items.length + 5), g.h - 2) });
      g.spans(inner.x, inner.y, inner.w, [{ t: "› ", st: accent }, { t: o.filter, st: text }]);
      g.cursor = { x: inner.x + 2 + width(o.filter), y: inner.y };
      o.sel = Math.min(o.sel, Math.max(0, items.length - 1));
      items.slice(0, inner.h - 3).forEach((p, i) => {
        const y = inner.y + 2 + i;
        const on = i === o.sel;
        const base: Style = on ? { fg: th.fg, bg: th.selection, bold: true } : text;
        if (on) g.fill(inner.x, y, inner.w, 1, base);
        const [glyph, gc] = statusGlyph(s, p, th);
        const tab = s.paneOfProc(p.id)?.tab.name ?? "";
        g.spans(inner.x, y, inner.w, [{ t: `${glyph} `, st: { fg: gc } }, { t: `${p.env} / ${tab} / ${s.name(p)}` }, { t: `  ${s.statusText(p)}`, st: { fg: th.muted } }], base);
        g.hit({ x: inner.x, y, w: inner.w, h: 1, kind: "picker-row", id: String(i) });
      });
      if (items.length === 0) g.text(inner.x, inner.y + 2, inner.w, "nothing matches", muted);
      g.text(inner.x, inner.y + inner.h - 1, inner.w, "⏎ go  ↑↓ select  esc close", muted);
      return;
    }
    case "confirm": {
      const inner = box(g, th, { title: o.title, w: Math.min(g.w - 2, Math.max(30, width(o.text) + 4)), h: 5 });
      g.text(inner.x, inner.y, inner.w, o.text, text);
      const y = inner.y + 2;
      g.spans(inner.x, y, inner.w, [{ t: "y", st: accent }, { t: " yes   ", st: text }, { t: "n", st: accent }, { t: " no", st: text }]);
      g.hit({ x: inner.x, y, w: 5, h: 1, kind: "confirm-yes" });
      g.hit({ x: inner.x + 7, y, w: 4, h: 1, kind: "confirm-no" });
      return;
    }
    case "prompt": {
      const inner = box(g, th, { title: o.title, w: Math.min(60, g.w - 4), h: 5 });
      g.spans(inner.x, inner.y, inner.w, [{ t: "› ", st: accent }, { t: o.value, st: text }]);
      g.cursor = { x: inner.x + 2 + width(o.value), y: inner.y };
      g.text(inner.x, inner.y + 2, inner.w, "⏎ ok  esc cancel", muted);
      return;
    }
  }
}

function drawToasts(g: Grid, s: Session, th: Theme) {
  const colour: Record<ToastKind, string> = { info: th.info, success: th.success, warning: th.warning, error: th.error };
  let y = 1;
  for (const t of s.toasts) {
    const text = ` ${truncate(t.text, Math.max(Math.floor(g.w / 2) - 2, 10))} `;
    const x = g.w - width(text) - 1;
    if (x < 0 || y >= g.h) return;
    g.text(x, y, width(text), text, { fg: colour[t.kind], bg: th.bg, bold: t.kind === "error" });
    y++;
  }
}

// --- detached: the terminal hive ran in ---

function drawOuter(g: Grid, s: Session, th: Theme) {
  const lines: Line[] = [...s.outer.lines, [{ t: "$ ", c: "green" }, { t: s.outer.input }]];
  const wrapped = lines.flatMap((l) => {
    const out: Line[] = [];
    let cur: Line = [];
    let n = 0;
    for (const seg of l) {
      for (const ch of seg.t) {
        if (n >= g.w) {
          out.push(cur);
          cur = [];
          n = 0;
        }
        cur.push({ ...seg, t: ch });
        n++;
      }
    }
    out.push(cur);
    return out;
  });
  const shown = wrapped.slice(-g.h);
  shown.forEach((l, i) => drawLine(g, 0, i, g.w, l, th));
  const last = shown[shown.length - 1] ?? [];
  g.cursor = { x: Math.min(last.length, g.w - 1), y: shown.length - 1 };
}
