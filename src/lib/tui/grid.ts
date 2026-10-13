/**
 * A screen of character cells, like a terminal's: what the renderer draws
 * into and the painter puts on a canvas. Every character is one cell wide
 * (the demo prints no wide characters).
 */
export interface Style {
  fg?: string;
  bg?: string;
  bold?: boolean;
  underline?: boolean;
  faint?: boolean;
}

export interface Cell {
  ch: string;
  st: Style;
}

export type HitKind = "env" | "agent" | "tab" | "newtab" | "pane" | "header" | "overview-row" | "picker-row" | "confirm-yes" | "confirm-no";

/** A clickable area, in cells. */
export interface Hit {
  x: number;
  y: number;
  w: number;
  h: number;
  kind: HitKind;
  id?: string;
}

export interface Span {
  t: string;
  st?: Style;
}

export const over = (base: Style, top: Style | undefined): Style => (top ? { ...base, ...stripUndefined(top) } : base);

function stripUndefined(s: Style): Style {
  const out: Style = {};
  for (const [k, v] of Object.entries(s)) if (v !== undefined) (out as Record<string, unknown>)[k] = v;
  return out;
}

export class Grid {
  readonly cells: Cell[];
  readonly hits: Hit[] = [];
  cursor: { x: number; y: number } | null = null;

  constructor(
    readonly w: number,
    readonly h: number,
    bg: string,
  ) {
    this.cells = Array.from({ length: w * h }, () => ({ ch: " ", st: { bg } }));
  }

  at(x: number, y: number): Cell | undefined {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return undefined;
    return this.cells[y * this.w + x];
  }

  set(x: number, y: number, ch: string, st: Style) {
    const c = this.at(x, y);
    if (!c) return;
    c.ch = ch;
    // A cell keeps its background unless the new style brings one.
    c.st = st.bg ? st : { ...st, bg: c.st.bg };
  }

  /** Writes text from (x, y), at most max cells; returns the x after it. */
  text(x: number, y: number, max: number, text: string, st: Style = {}): number {
    const end = x + Math.max(0, max);
    for (const ch of text) {
      if (x >= end) break;
      this.set(x, y, ch, st);
      x++;
    }
    return x;
  }

  spans(x: number, y: number, max: number, spans: Span[], base: Style = {}): number {
    const end = x + max;
    for (const s of spans) x = this.text(x, y, end - x, s.t, over(base, s.st));
    return x;
  }

  fill(x: number, y: number, w: number, h: number, st: Style) {
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) this.set(i, j, " ", st);
  }

  /** A rounded box on r's edge, with a bold title on its top line. */
  box(x: number, y: number, w: number, h: number, st: Style, title = "") {
    if (w < 2 || h < 2) return;
    const x2 = x + w - 1;
    const y2 = y + h - 1;
    for (let i = x + 1; i < x2; i++) {
      this.set(i, y, "─", st);
      this.set(i, y2, "─", st);
    }
    for (let j = y + 1; j < y2; j++) {
      this.set(x, j, "│", st);
      this.set(x2, j, "│", st);
    }
    this.set(x, y, "╭", st);
    this.set(x2, y, "╮", st);
    this.set(x, y2, "╰", st);
    this.set(x2, y2, "╯", st);
    if (title && w > 6) this.text(x + 2, y, w - 4, ` ${truncate(title, w - 6)} `, { ...st, bold: true });
  }

  hit(h: Hit) {
    this.hits.push(h);
  }

  /** The topmost hit under a cell. */
  hitAt(x: number, y: number): Hit | undefined {
    for (let i = this.hits.length - 1; i >= 0; i--) {
      const h = this.hits[i];
      if (x >= h.x && x < h.x + h.w && y >= h.y && y < h.y + h.h) return h;
    }
    return undefined;
  }

  /** The screen as text, one line per row (tests and debugging). */
  toString(): string {
    const rows: string[] = [];
    for (let y = 0; y < this.h; y++) {
      let row = "";
      for (let x = 0; x < this.w; x++) row += this.cells[y * this.w + x].ch;
      rows.push(row.trimEnd());
    }
    return rows.join("\n");
  }
}

export const width = (s: string) => [...s].length;

export function truncate(s: string, max: number): string {
  const chars = [...s];
  if (chars.length <= max) return s;
  if (max <= 1) return chars.slice(0, max).join("");
  return chars.slice(0, max - 1).join("") + "…";
}

export const pad = (s: string, n: number) => {
  const w = width(s);
  return w >= n ? truncate(s, n) : s + " ".repeat(n - w);
};
