/**
 * Puts a Grid on a canvas like a terminal does: every character in its own
 * cell, so symbols from a fallback font cannot push the columns out of
 * line, and box-drawing lines drawn as strokes so borders always join.
 */
import type { Grid, Style } from "./grid";

export const FAMILY = '"Geist Mono Variable", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';

export interface Metrics {
  size: number;
  /** Cell width and height, CSS px. */
  cw: number;
  ch: number;
  dpr: number;
}

export function measure(size: number, dpr: number): Metrics {
  const ctx = document.createElement("canvas").getContext("2d");
  let cw = size * 0.6;
  if (ctx) {
    ctx.font = `400 ${size}px ${FAMILY}`;
    cw = ctx.measureText("MMMMMMMMMM").width / 10;
  }
  return { size, cw, ch: Math.round(size * 1.42), dpr };
}

const L = 1;
const R = 2;
const U = 4;
const D = 8;
const LINES: Record<string, number> = {
  "─": L | R, "│": U | D, "┬": L | R | D, "┴": L | R | U, "├": U | D | R, "┤": U | D | L, "┼": L | R | U | D,
  "┌": R | D, "┐": L | D, "└": R | U, "┘": L | U,
};
const ROUND: Record<string, number> = { "╭": R | D, "╮": L | D, "╰": R | U, "╯": L | U };

const font = (st: Style, size: number) => `${st.bold ? 600 : 400} ${size}px ${FAMILY}`;

export interface PaintOptions {
  cursor: boolean;
  cursorColor: string;
  cursorText: string;
}

export function paint(ctx: CanvasRenderingContext2D, g: Grid, m: Metrics, o: PaintOptions) {
  const { cw, ch, dpr } = m;
  const snap = (v: number) => Math.round(v * dpr) / dpr;
  const X = (x: number) => snap(x * cw);
  const Y = (y: number) => snap(y * ch);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";

  // Backgrounds, in runs.
  for (let y = 0; y < g.h; y++) {
    let x = 0;
    while (x < g.w) {
      const bg = g.cells[y * g.w + x].st.bg ?? "#000";
      let e = x + 1;
      while (e < g.w && (g.cells[y * g.w + e].st.bg ?? "#000") === bg) e++;
      ctx.fillStyle = bg;
      ctx.fillRect(X(x), Y(y), X(e) - X(x), Y(y + 1) - Y(y));
      x = e;
    }
  }

  let curFont = "";
  const t = Math.max(1 / dpr, snap(Math.max(1, m.size / 13)));
  const glyph = (c: string, x: number, y: number, st: Style, colour: string) => {
    const x0 = X(x);
    const y0 = Y(y);
    const x1 = X(x + 1);
    const y1 = Y(y + 1);
    ctx.globalAlpha = st.faint ? 0.5 : 1;
    ctx.fillStyle = colour;
    ctx.strokeStyle = colour;
    const cx = snap(x0 + cw / 2 - t / 2);
    const cy = snap(y0 + ch / 2 - t / 2);
    const arms = LINES[c];
    if (arms) {
      if (arms & L) ctx.fillRect(x0, cy, cx + t - x0, t);
      if (arms & R) ctx.fillRect(cx, cy, x1 - cx, t);
      if (arms & U) ctx.fillRect(cx, y0, t, cy + t - y0);
      if (arms & D) ctx.fillRect(cx, cy, t, y1 - cy);
      return;
    }
    const round = ROUND[c];
    if (round) {
      const mx = cx + t / 2;
      const my = cy + t / 2;
      const r = Math.min(cw, ch) / 2;
      ctx.lineWidth = t;
      ctx.beginPath();
      ctx.moveTo(round & R ? x1 : x0, my);
      ctx.arcTo(mx, my, mx, round & D ? y1 : y0, r);
      ctx.lineTo(mx, round & D ? y1 : y0);
      ctx.stroke();
      return;
    }
    if (c === "█" || c === "▌") {
      ctx.fillRect(x0, y0, c === "▌" ? snap(cw / 2) : x1 - x0, y1 - y0);
      return;
    }
    const f = font(st, m.size);
    if (f !== curFont) {
      ctx.font = f;
      curFont = f;
    }
    const w = ctx.measureText(c).width;
    if (w > cw * 1.15) {
      // A wide fallback glyph: squeeze it into its cell.
      ctx.save();
      ctx.translate(x0, y0 + ch / 2);
      ctx.scale(cw / w, 1);
      ctx.fillText(c, 0, 0);
      ctx.restore();
    } else {
      ctx.fillText(c, x0 + (cw - w) / 2, y0 + ch / 2);
    }
  };

  for (let y = 0; y < g.h; y++) {
    let x = 0;
    while (x < g.w) {
      const cell = g.cells[y * g.w + x];
      const fg = cell.st.fg ?? "#ccc";
      // Runs of plain ASCII in one style go in one call; the font's cells match ours.
      if (/^[!-~]$/.test(cell.ch) && !cell.st.underline) {
        let s = cell.ch;
        let e = x + 1;
        while (e < g.w) {
          const n = g.cells[y * g.w + e];
          if (!/^[ -~]$/.test(n.ch) || n.st.fg !== cell.st.fg || n.st.bold !== cell.st.bold || n.st.faint !== cell.st.faint || n.st.underline) break;
          s += n.ch;
          e++;
        }
        const f = font(cell.st, m.size);
        if (f !== curFont) {
          ctx.font = f;
          curFont = f;
        }
        ctx.globalAlpha = cell.st.faint ? 0.5 : 1;
        ctx.fillStyle = fg;
        ctx.fillText(s.trimEnd(), X(x), Y(y) + ch / 2);
        x = e;
        continue;
      }
      if (cell.ch !== " ") glyph(cell.ch, x, y, cell.st, fg);
      if (cell.st.underline) {
        ctx.globalAlpha = 1;
        ctx.fillStyle = fg;
        if (cell.ch !== " " && /^[!-~]$/.test(cell.ch)) {
          ctx.font = font(cell.st, m.size);
          curFont = ctx.font;
          ctx.fillText(cell.ch, X(x), Y(y) + ch / 2);
        }
        ctx.fillRect(X(x), snap(Y(y) + ch / 2 + m.size * 0.55), X(x + 1) - X(x), t);
      }
      x++;
    }
  }
  ctx.globalAlpha = 1;

  if (o.cursor && g.cursor) {
    const { x, y } = g.cursor;
    const cell = g.at(x, y);
    ctx.fillStyle = o.cursorColor;
    ctx.fillRect(X(x), Y(y), X(x + 1) - X(x), Y(y + 1) - Y(y));
    if (cell && cell.ch !== " ") {
      ctx.font = font(cell.st, m.size);
      curFont = ctx.font;
      ctx.fillStyle = o.cursorText;
      const w = ctx.measureText(cell.ch).width;
      ctx.fillText(cell.ch, X(x) + (cw - w) / 2, Y(y) + ch / 2);
    }
  }
}
