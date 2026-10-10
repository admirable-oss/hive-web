import { GITHUB_TOKEN } from "astro:env/server";
import snapshot from "@/data/ROADMAP.md?raw";
import {
  fetchActivity,
  fetchCommits,
  fetchContributors,
  fetchFileCommit,
  fetchRelease,
  fetchRepo,
  fetchRoadmapMd,
  fetchSignals,
  GitHubError,
  type Commit,
  type Contributor,
  type Release,
  type RepoInfo,
  type Signals,
  type Week,
} from "./github";

/**
 * Server-side GitHub reads for /roadmap (the page render and the `roadmap`
 * Astro Action). The token never leaves the server; every resource is cached
 * in memory for its own lifetime, refreshed with ETag-conditional requests,
 * and served stale if a refresh fails. On Vercel a warm function instance
 * shares this cache across visitors; ISR caches the rendered page on top.
 */

/** "computing": GitHub answered 202 while it builds the stats. */
export type Failure = "auth" | "forbidden" | "rate" | "http" | "computing";
export type ActState = "ok" | Failure;

export interface RoadmapPayload {
  md: string;
  /** "live": read from main; "snapshot": the bundled src/data/ROADMAP.md (GitHub unreachable). */
  source: "live" | "snapshot";
  /** When ROADMAP.md was last read from main. */
  checkedAt: number;
  commits: Commit[] | null;
  repo: RepoInfo | null;
  release: Release | null;
  contribs: Contributor[] | null;
  activity: Week[] | null;
  actState: ActState;
  signals: Signals | null;
  fileCommit: { sha: string; date: string; url: string } | null;
  errors: Partial<Record<"commits" | "repo" | "signals" | "contribs", Failure>>;
}

const MIN = 60_000;
/** ROADMAP.md: three reads a day. Everything else as fresh as it's worth. */
const TTL = {
  md: 8 * 60 * MIN,
  commits: 1 * MIN,
  repo: 5 * MIN,
  signals: 30 * MIN,
  fileCommit: 30 * MIN,
  release: 30 * MIN,
  contribs: 60 * MIN,
  activity: 60 * MIN,
};
type Key = keyof typeof TTL;

interface Entry<T> {
  at: number;
  value: T | null;
  error?: Failure;
  pending?: Promise<void>;
}
const store = new Map<Key, Entry<unknown>>();
const FORCE_COOLDOWN = 30_000;
let lastForcedRefresh = 0;

const failure = (e: unknown): Failure => {
  if (!(e instanceof GitHubError)) return "http";
  if (e.status === 202) return "computing";
  if (e.status === 401) return "auth";
  if (e.status === 403 && !e.rate) return "forbidden";
  return e.rate ? "rate" : "http";
};

/** Fresh-enough value, else refresh (one in flight per key); on failure keep the last good value. */
async function cached<T>(key: Key, load: () => Promise<T>, force = false): Promise<Entry<T>> {
  const hit = store.get(key) as Entry<T> | undefined;
  if (hit?.pending) {
    await hit.pending;
    return store.get(key) as Entry<T>;
  }
  // A failed refresh keeps its previous value and observes a short retry
  // cooldown; without this, every public action call can immediately retry.
  if (!force && hit && Date.now() - hit.at < (hit.error ? MIN : TTL[key])) return hit;
  const entry: Entry<T> = hit ?? { at: 0, value: null };
  entry.pending = load().then(
    (value) => void Object.assign(entry, { at: Date.now(), value, error: undefined }),
    // Retry a failure after a minute rather than the full lifetime.
    (e) => void Object.assign(entry, { at: Date.now(), error: failure(e) }),
  );
  store.set(key, entry);
  await entry.pending;
  entry.pending = undefined;
  return entry;
}

export async function getRoadmapData({ force = false }: { force?: boolean } = {}): Promise<RoadmapPayload> {
  // The action is public. Keep explicit cache bypasses bounded per warm
  // instance so repeated requests cannot fan out to GitHub without limit.
  const now = Date.now();
  const forceRefresh = force && now - lastForcedRefresh >= FORCE_COOLDOWN;
  if (forceRefresh) lastForcedRefresh = now;
  const token = GITHUB_TOKEN || undefined;
  const [md, commits, repo, release, contribs, activity, signals, fileCommit] = await Promise.all([
    cached("md", fetchRoadmapMd, forceRefresh),
    cached("commits", () => fetchCommits(token), forceRefresh),
    cached("repo", () => fetchRepo(token), forceRefresh),
    cached("release", () => fetchRelease(token), forceRefresh),
    cached("contribs", () => fetchContributors(token), forceRefresh),
    // GitHub answers 202 while it computes the stats: don't cache that as a result.
    cached("activity", async () => {
      const a = await fetchActivity(token);
      if (a === null) throw new GitHubError(202, false);
      return a;
    }, forceRefresh),
    cached("signals", () => fetchSignals(token), forceRefresh),
    cached("fileCommit", () => fetchFileCommit(token), forceRefresh),
  ]);

  return {
    md: md.value ?? snapshot,
    source: md.value ? "live" : "snapshot",
    checkedAt: md.value ? md.at : Date.now(),
    commits: commits.value,
    repo: repo.value,
    release: release.value,
    contribs: contribs.value,
    activity: activity.value,
    actState: activity.value ? "ok" : (activity.error ?? "computing"),
    signals: signals.value,
    fileCommit: fileCommit.value,
    errors: {
      ...(commits.error ? { commits: commits.error } : {}),
      ...(repo.error ? { repo: repo.error } : {}),
      ...(signals.error ? { signals: signals.error } : {}),
      ...(contribs.error ? { contribs: contribs.error } : {}),
    },
  };
}
