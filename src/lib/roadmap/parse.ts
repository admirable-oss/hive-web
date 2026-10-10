/**
 * ROADMAP.md → milestones. Runs at build time (roadmap.astro) and in the
 * browser when the live file is re-read. Headings shaped like
 * `## M2 · Workspace Model — \`v0.4\` ← **START HERE**` become milestones;
 * `LIVE`/`SHIPPED`/`DONE` mark them shipped, `START HERE`/`IN PROGRESS`/`NOW`
 * mark the one being built, and a `Post-1.0` heading collects the wishlist.
 */

export type Status = "done" | "current" | "planned" | "later";

export interface Item {
  title: string;
  desc: string;
  /** Package-ish names (`internal/config` → `config`) used to find code on main. */
  keys: string[];
}

export interface Milestone {
  id: string;
  title: string;
  version: string;
  status: Status;
  blurb: string;
  items: Item[];
  accept: string;
  acceptLabel: string;
  keys: string[];
}

export interface Roadmap {
  intro: string;
  milestones: Milestone[];
}

/** Text run for inline rendering: plain, `code` or **bold**. */
export interface Seg {
  t: string;
  kind?: "code" | "bold";
}

const GENERIC = new Set(
  "go md json toml the and internal cmd pkg hive main test tests fix add update docs readme bump chore feat refactor list get start stop show path default mode error model service module store logs api".split(
    " ",
  ),
);

export const clean = (s: string) =>
  String(s || "")
    .replace(/<[^>]*>/g, "")
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]️?/gu, "")
    .replace(/\\_/g, "_")
    .replace(/\s+/g, " ")
    .trim();

export const plain = (s: string) =>
  clean(s)
    .replace(/\*\*/g, "")
    .replace(/`/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");

function keysOf(text: string, pathsOnly = false) {
  const keys: string[] = [];
  for (const m of String(text).matchAll(/`([^`]+)`/g)) {
    let tk = m[1].trim();
    if (!/^[a-z][a-z0-9_/.-]*$/.test(tk)) continue;
    if (pathsOnly && !tk.includes("/")) continue;
    tk = tk.split("/").filter(Boolean).pop()!.replace(/\.(go|toml|json|md)$/, "");
    if (tk.length >= 2 && !GENERIC.has(tk) && !keys.includes(tk)) keys.push(tk);
  }
  return keys;
}

export function parseRoadmap(md: string): Roadmap {
  const lines = md.replace(/\r/g, "").split("\n");
  const milestones: Milestone[] = [];
  const intro: string[] = [];
  let cur: Milestone | null = null;
  let item: Item | null = null;
  let seen = false;

  for (const raw of lines) {
    const l = raw.trim();
    let m: RegExpMatchArray | null;
    if (/^#\s/.test(l) || /^</.test(l) || /^!\[/.test(l)) continue;

    // A milestone heading at ## or ### (`### M4 · Agent intelligence (v0.6) ← **START HERE**` exists upstream).
    const mh = l.match(/^#{2,3}\s+(.*)$/);
    const isMilestone = mh && (/(M\d+)\s*·/.test(mh[1]) || (/^##\s/.test(l) && /post-1\.0/i.test(mh[1])));
    if (mh && (isMilestone || /^##\s/.test(l))) {
      seen = true;
      const hd = mh[1];
      const im = hd.match(/(M\d+)\s*·\s*(.+)/);
      const later = !im && /post-1\.0/i.test(hd);
      if (!im && !later) {
        cur = null;
        continue;
      }
      const rest = im ? im[2] : hd;
      // Version: the last `code` span, or a parenthesised (v0.6).
      const ticks = [...rest.matchAll(/`([^`]+)`/g)].map((x) => x[1]);
      const paren = rest.match(/\((v\d[^)]*)\)/)?.[1];
      const title = rest
        .split(/\s+[—←]\s+/)[0]
        .replace(/\s*→\s*`[^`]+`/, "")
        .replace(/\s*\(v\d[^)]*\)/, "");
      cur = {
        id: im ? im[1] : "Later",
        title: later ? "After 1.0" : plain(title),
        version: later ? "post-1.0" : (ticks[ticks.length - 1] ?? paren ?? ""),
        status: later ? "later" : /LIVE|SHIPPED|DONE/i.test(hd) ? "done" : /START HERE|IN PROGRESS|BUILDING|NOW/i.test(hd) ? "current" : "planned",
        blurb: "",
        items: [],
        accept: "",
        acceptLabel: "",
        keys: [],
      };
      milestones.push(cur);
      item = null;
      continue;
    }

    if (!seen) {
      if (l && !/^>|^---/.test(l)) intro.push(l);
      continue;
    }
    if (!cur || !l || /^---/.test(l)) continue;

    if ((m = l.match(/^###\s+(?:\d+\.\s*)?(.*)$/))) {
      const parts = m[1].split(/\s+—\s+/);
      item = { title: parts[0], desc: parts.slice(1).join(" — "), keys: [] };
      cur.items.push(item);
      continue;
    }
    if ((m = l.match(/^\*\*(?:✅\s*)?([A-Za-z ]+):\*\*\s*(.*)$/))) {
      cur.acceptLabel = m[1].trim();
      cur.accept = m[2];
      item = null;
      continue;
    }
    if ((m = raw.match(/^(\s*)(\d+\.|[-*])\s+(.*)$/))) {
      const indent = m[1].length;
      const numbered = /\d/.test(m[2]);
      const body = m[3];
      if (indent === 0 && (numbered || !item || cur.status === "later")) {
        const bm = body.match(/^\*\*(.+?)\*\*\s*(?:[—–]\s*)?(.*)$/);
        // Unbolded items like "`agent` engine: process detection, …" split at the first colon.
        const cm = !bm && body.match(/^(.{2,60}?):\s+(.+)$/);
        item = bm
          ? { title: bm[1], desc: bm[2], keys: [] }
          : cm
            ? { title: cm[1], desc: cm[2], keys: [] }
            : { title: body, desc: "", keys: [] };
        cur.items.push(item);
      } else if (item) item.desc += (item.desc ? " · " : "") + body;
      continue;
    }
    if (!cur.blurb && !cur.items.length) cur.blurb = plain(l);
  }

  if (!milestones.some((ms) => ms.status === "current")) {
    const next = milestones.find((ms) => ms.status === "planned");
    if (next) next.status = "current";
  }

  for (const ms of milestones) {
    for (const it of ms.items) it.keys = [...new Set([...keysOf(it.title), ...keysOf(it.desc, true)])];
    ms.keys = [...new Set(ms.items.flatMap((it) => keysOf(`${it.title} ${it.desc}`)))];
  }
  return { intro: plain(intro.join(" ")), milestones };
}

/** Inline runs for rendering markdown-lite text (code spans and bold). */
export function segs(text: string): Seg[] {
  const t = clean(text).replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
  const out: Seg[] = [];
  const re = /`([^`]+)`|\*\*([^*]+)\*\*/g;
  let i = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(t))) {
    if (m.index > i) out.push({ t: t.slice(i, m.index) });
    out.push(m[1] != null ? { t: m[1], kind: "code" } : { t: m[2], kind: "bold" });
    i = re.lastIndex;
  }
  if (i < t.length) out.push({ t: t.slice(i) });
  return out;
}
