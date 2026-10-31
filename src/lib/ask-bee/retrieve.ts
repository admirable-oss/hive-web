import { LIMITS } from "./limits";
import type { Source } from "./types";

/*
 * Retrieval in the browser, on the Pagefind index Starlight already builds:
 * no vector store, no extra round trip, and the index is cached like any
 * static file. Pagefind exists only in built sites (astro build / preview).
 */

interface PagefindAnchor {
  element: string;
  id: string;
  text: string;
  location: number;
}
interface PagefindSubResult {
  title: string;
  url: string;
  locations: number[];
  anchor?: PagefindAnchor;
}
interface PagefindData {
  url: string;
  content: string;
  meta: { title?: string };
  anchors: PagefindAnchor[];
  sub_results: PagefindSubResult[];
}
interface PagefindResult {
  id: string;
  data(): Promise<PagefindData>;
}
interface Pagefind {
  init(): Promise<void>;
  search(query: string): Promise<{ results: PagefindResult[] }>;
}

let loading: Promise<Pagefind> | undefined;

/** Loads (once) and warms the index; call when the drawer opens. */
export function loadPagefind(): Promise<Pagefind> {
  loading ??= import(/* @vite-ignore */ `${import.meta.env.BASE_URL}pagefind/pagefind.js`).then(async (pf: Pagefind) => {
    await pf.init();
    return pf;
  });
  loading.catch(() => (loading = undefined));
  return loading;
}

const STOP = new Set(
  "a an and are as at be but by can do does did for from get got has have how i if in into is it its me my of on or our should so that the their them then there these this to use using was we what when where which who why will with would you your hive".split(" "),
);

/** Search terms: Pagefind ranks on terms, so filler words only dilute it. */
function keywords(question: string): string[] {
  const words = question.toLowerCase().match(/[\p{L}\p{N}][\p{L}\p{N}._\-]*/gu) ?? [];
  const kept = words.filter((w) => !STOP.has(w));
  return [...new Set(kept.length ? kept : words)];
}

/**
 * Pages for the terms. Pagefind matches pages holding every term, which a
 * conversational question rarely fits; when that finds too little, each term
 * is searched alone and pages rank by how many terms they hold.
 */
async function search(pagefind: Pagefind, terms: string[], extra: string[]): Promise<PagefindResult[]> {
  const all = (await pagefind.search(terms.join(" "))).results;
  const loose = [...new Set([...terms, ...extra])];
  if (all.length >= 4 || loose.length < 2) return all;

  const tally = new Map<string, { result: PagefindResult; hits: number; best: number }>();
  const perTerm = await Promise.all(loose.map((term) => pagefind.search(term)));
  for (const { results } of perTerm) {
    results.slice(0, 20).forEach((result, rank) => {
      const t = tally.get(result.id) ?? { result, hits: 0, best: rank };
      t.hits++;
      t.best = Math.min(t.best, rank);
      tally.set(result.id, t);
    });
  }
  const strict = new Set(all.map((r) => r.id));
  const more = [...tally.values()]
    .filter((t) => !strict.has(t.result.id))
    .sort((a, b) => b.hits - a.hits || a.best - b.best)
    .map((t) => t.result);
  return [...all, ...more];
}

const level = (element: string) => Number(element.replace(/\D/g, "")) || 1;

/** RFCs and ADRs explain why; guides explain how, which is what people ask. */
const isDesignDoc = (url: string) => /^\/docs\/(community\/rfc-|ref\/architecture\/)/.test(url);

/** The words of one section: from its heading to the next heading at its level or above. */
function sectionText(data: PagefindData, sub: PagefindSubResult): string {
  const words = data.content.split(/\s+/);
  const start = sub.anchor?.location ?? 0;
  // A page's intro (no anchor, or Starlight's _top) ends at its first heading.
  const depth = sub.anchor && sub.anchor.id !== "_top" ? level(sub.anchor.element) : 6;
  const next = data.anchors
    .filter((a) => a.location > start && level(a.element) <= depth)
    .reduce((min, a) => Math.min(min, a.location), words.length);
  return words.slice(start, next).join(" ").slice(0, LIMITS.sourceText);
}

/** The best-matching docs sections for a question, at most LIMITS.sources. */
export async function retrieve(question: string, previous?: string): Promise<Source[]> {
  const pagefind = await loadPagefind();
  // A follow-up ("and on Windows?") often needs the terms of the question it follows.
  const results = await search(pagefind, keywords(question), previous ? keywords(previous) : []);

  const ranked = await Promise.all(results.slice(0, 8).map((r) => r.data()));
  // Stable: guides keep their order and go first, design docs after them.
  const pages = [...ranked.filter((p) => !isDesignDoc(p.url)), ...ranked.filter((p) => isDesignDoc(p.url))].slice(0, 4);
  const sources: Source[] = [];
  const seen = new Set<string>();
  pages.forEach((page, rank) => {
    const sections = [...page.sub_results].sort((a, b) => b.locations.length - a.locations.length).slice(0, rank === 0 ? 2 : 1);
    for (const sub of sections) {
      const url = sub.url || page.url;
      if (seen.has(url) || !url.startsWith("/docs/")) continue;
      seen.add(url);
      const page_title = page.meta.title ?? "Hive docs";
      const title = sub.title && sub.title !== page_title ? `${page_title} › ${sub.title}` : page_title;
      sources.push({ title, url, text: sectionText(page, sub) });
    }
  });
  return sources.slice(0, LIMITS.sources);
}
