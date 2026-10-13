/**
 * A tab's panes as a binary split tree, like hive's layout package. A
 * pane's rectangle includes its top line, where its border and title go;
 * a split to the right puts a one-column border between its halves.
 */
export type Node = { kind: "leaf"; pane: string } | { kind: "split"; dir: "right" | "down"; ratio: number; a: Node; b: Node };

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type Dir = "left" | "right" | "up" | "down";

export const leaf = (pane: string): Node => ({ kind: "leaf", pane });

export function panes(n: Node): string[] {
  return n.kind === "leaf" ? [n.pane] : [...panes(n.a), ...panes(n.b)];
}

/** Each pane's rectangle within r. */
export function geometry(n: Node, r: Rect, out = new Map<string, Rect>()): Map<string, Rect> {
  if (n.kind === "leaf") {
    out.set(n.pane, r);
    return out;
  }
  if (n.dir === "right") {
    const wa = clamp(Math.round((r.w - 1) * n.ratio), 1, Math.max(1, r.w - 2));
    geometry(n.a, { ...r, w: wa }, out);
    geometry(n.b, { ...r, x: r.x + wa + 1, w: r.w - wa - 1 }, out);
  } else {
    const ha = clamp(Math.round(r.h * n.ratio), 2, Math.max(2, r.h - 2));
    geometry(n.a, { ...r, h: ha }, out);
    geometry(n.b, { ...r, y: r.y + ha, h: r.h - ha }, out);
  }
  return out;
}

/** Splits pane in two, the new pane right of or below it. */
export function split(n: Node, pane: string, dir: "right" | "down", added: string): Node {
  if (n.kind === "leaf") return n.pane === pane ? { kind: "split", dir, ratio: 0.5, a: n, b: leaf(added) } : n;
  return { ...n, a: split(n.a, pane, dir, added), b: split(n.b, pane, dir, added) };
}

/** The tree without pane, or null when it was the last one. */
export function remove(n: Node, pane: string): Node | null {
  if (n.kind === "leaf") return n.pane === pane ? null : n;
  const a = remove(n.a, pane);
  const b = remove(n.b, pane);
  if (!a) return b;
  if (!b) return a;
  return { ...n, a, b };
}

/**
 * Moves the border on the dir side of pane by step (a fraction): the
 * nearest split across that axis that has pane on the matching side.
 */
export function resize(n: Node, pane: string, dir: Dir, step = 0.05): Node {
  const axis = dir === "left" || dir === "right" ? "right" : "down";
  const grow = dir === "right" || dir === "down" ? step : -step;
  const walk = (m: Node): { node: Node; done: boolean } => {
    if (m.kind === "leaf") return { node: m, done: false };
    const inA = panes(m.a).includes(pane);
    const inB = !inA && panes(m.b).includes(pane);
    if (!inA && !inB) return { node: m, done: false };
    const child = walk(inA ? m.a : m.b);
    const next = inA ? { ...m, a: child.node } : { ...m, b: child.node };
    if (child.done || m.dir !== axis) return { node: next, done: child.done };
    return { node: { ...next, ratio: clamp(next.ratio + grow, 0.15, 0.85) }, done: true };
  };
  return walk(n).node;
}

/** The pane next to from in dir: the most overlapping of the nearest. */
export function neighbor(geo: Map<string, Rect>, from: string, dir: Dir): string | undefined {
  const r = geo.get(from);
  if (!r) return undefined;
  let best: string | undefined;
  let bestScore = -Infinity;
  for (const [id, o] of geo) {
    if (id === from) continue;
    let gap: number;
    let overlap: number;
    switch (dir) {
      case "right":
        gap = o.x - (r.x + r.w);
        overlap = Math.min(r.y + r.h, o.y + o.h) - Math.max(r.y, o.y);
        break;
      case "left":
        gap = r.x - (o.x + o.w);
        overlap = Math.min(r.y + r.h, o.y + o.h) - Math.max(r.y, o.y);
        break;
      case "down":
        gap = o.y - (r.y + r.h);
        overlap = Math.min(r.x + r.w, o.x + o.w) - Math.max(r.x, o.x);
        break;
      case "up":
        gap = r.y - (o.y + o.h);
        overlap = Math.min(r.x + r.w, o.x + o.w) - Math.max(r.x, o.x);
        break;
    }
    if (gap < 0 || overlap <= 0) continue;
    const score = -gap * 1000 + overlap;
    if (score > bestScore) {
      bestScore = score;
      best = id;
    }
  }
  return best;
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
