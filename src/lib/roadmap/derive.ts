import type { Commit, Signals } from "./github";
import { plain, type Item, type Milestone, type Status } from "./parse";

export const COLORS = {
  shipped: "#C98F2E",
  honey: "#F5B942",
  planned: "#A9A59B",
  later: "#8E8A80",
} as const;

export const STATUS: Record<Status, { label: string; color: string }> = {
  done: { label: "Live", color: COLORS.shipped },
  current: { label: "Building now", color: COLORS.honey },
  planned: { label: "Planned", color: COLORS.planned },
  later: { label: "After 1.0", color: COLORS.later },
};

export const shortId = (m: Milestone) => (m.id === "Later" ? "1.0+" : m.id);

export const idColor = (m: Milestone) => (m.status === "current" ? COLORS.honey : m.status === "done" ? COLORS.shipped : "#C9C5BB");

export interface ItemSignal {
  sig: string;
  color: string;
  title: string;
  has: boolean;
  /** The item names no package, so it can't be checked against main. */
  nokey?: boolean;
}

/** Does code an item names exist on main? A mark means code exists, not that the item is done. */
export function itemSignal(m: Milestone, it: Item, signals: Signals | null): ItemSignal {
  if (m.status === "done") return { sig: "shipped", color: COLORS.shipped, title: "Milestone is live", has: true };
  if (m.status === "later") return { sig: "", color: COLORS.later, title: "", has: false };
  if (!it.keys.length) return { sig: "", color: COLORS.later, title: "This item names no package", has: false, nokey: true };
  if (!signals) return { sig: "…", color: COLORS.later, title: "Reading the source tree", has: false };
  const k = it.keys.find((key) => signals[key]);
  if (k) return { sig: `● ${signals[k]}`, color: COLORS.honey, title: "This path exists on main. Code exists; the item may not be finished.", has: true };
  return { sig: "○ not on main yet", color: COLORS.later, title: "No matching package on main yet", has: false };
}

export interface ProgCell {
  title: string;
  /** "shipped" | "has" (code on main) | "open" | "none" (names no package). */
  state: "shipped" | "has" | "open" | "none";
}

export interface Progress {
  sigs: ItemSignal[];
  frac: number;
  label: string;
  cells: ProgCell[];
}

/** `unavailable`: the source tree couldn't be read, so say so instead of "reading…". */
export function progressOf(m: Milestone, signals: Signals | null, unavailable = false): Progress {
  const sigs = m.items.map((it) => itemSignal(m, it, signals));
  const keyed = sigs.filter((s) => !s.nokey).length;
  const has = sigs.filter((s) => s.has && !s.nokey).length;
  const label =
    m.status === "done"
      ? `${m.items.length} items shipped`
      : m.status === "later"
        ? `${m.items.length} ideas`
        : !signals
          ? unavailable
            ? "source tree unavailable right now"
            : "reading the source tree…"
          : `${has} of ${keyed} named packages exist on main`;
  return {
    sigs,
    frac: keyed ? has / keyed : 0,
    label,
    cells: sigs.map((s, i) => ({
      title: plain(m.items[i].title),
      state: m.status === "done" ? "shipped" : s.has ? "has" : s.nokey ? "none" : "open",
    })),
  };
}

/** Which milestone a commit belongs to: an explicit `M4`, else the best keyword match, else the current one. */
export function destOf(c: Commit, ms: Milestone[]): { id: string; why: string } {
  const msg = c.msg.toLowerCase();
  const mm = msg.match(/\bm(\d{1,2})\b/);
  if (mm) {
    const f = ms.find((m) => m.id.toLowerCase() === `m${mm[1]}`);
    if (f) return { id: f.id, why: `commit mentions ${f.id}` };
  }
  const words = new Set(msg.split(/[^a-z0-9_]+/).filter(Boolean));
  let best: Milestone | null = null;
  let bestScore = 0;
  let bestWord = "";
  for (const m of ms) {
    if (m.status === "later") continue;
    let score = 0;
    let word = "";
    for (const k of m.keys)
      if (words.has(k)) {
        score++;
        word ||= k;
      }
    if (score && m.status === "current") score += 0.5;
    if (score > bestScore) {
      bestScore = score;
      best = m;
      bestWord = word;
    }
  }
  if (best) return { id: best.id, why: `matched “${bestWord}”` };
  const cur = ms.find((m) => m.status === "current") ?? ms[0];
  return { id: cur?.id ?? "", why: "no keyword match, so it joins the current milestone" };
}

export function ago(d: string | number | null | undefined, now: number) {
  if (!d) return "—";
  const s = Math.max(0, (now - new Date(d).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 86400 * 30) return `${Math.floor(s / 86400)}d ago`;
  return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export const fmt = (n: number) => Math.round(n || 0).toLocaleString("en-US");
