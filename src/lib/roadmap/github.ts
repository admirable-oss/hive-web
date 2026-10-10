/**
 * GitHub reads for the roadmap page. Used at build time (with GITHUB_TOKEN when
 * set) and in the browser (unauthenticated, ETag-conditional so unchanged
 * answers come back as 304s and don't spend the rate limit).
 */

const OWNER_REPO = "admirable-oss/hive";
const API_VERSION = "2026-03-10";
const API_HEADERS = {
  Accept: "application/vnd.github+json",
  "X-GitHub-Api-Version": API_VERSION,
  "User-Agent": "HiveRoadmap/1.0 (+https://github.com/admirable-oss/hive)",
};
export const API = `https://api.github.com/repos/${OWNER_REPO}`;
export const ROADMAP_RAW = `https://raw.githubusercontent.com/${OWNER_REPO}/main/ROADMAP.md`;
export const ROADMAP_URL = `https://github.com/${OWNER_REPO}/blob/main/ROADMAP.md`;
export const ROADMAP_EDIT = `https://github.com/${OWNER_REPO}/edit/main/ROADMAP.md`;

export interface Commit {
  sha: string;
  msg: string;
  author: string;
  date: string;
  url: string;
}
export interface RepoInfo {
  stars: number;
  forks: number;
  issues: number;
  watchers: number;
  pushed: string;
  lang: string | null;
  license: string | null;
  created: string;
}
export interface Release {
  tag: string;
  date: string | null;
}
export interface Contributor {
  login: string;
  avatar: string;
  url: string;
  n: number;
}
export interface Week {
  t: number;
  week: number;
}
/** Leaf directory name under internal/, pkg/ or cmd/ → its path on main. */
export type Signals = Record<string, string>;

export class GitHubError extends Error {
  constructor(
    readonly status: number,
    readonly rate: boolean,
  ) {
    super(rate ? "rate" : "http");
  }
}

const etags = new Map<string, { etag: string | null; data: unknown }>();

async function gh<T>(path: string, token?: string): Promise<T> {
  const url = path.startsWith("http") ? path : `${API}${path}`;
  const headers: Record<string, string> = { ...API_HEADERS };
  if (token) headers.Authorization = `Bearer ${token}`;
  const cached = etags.get(url);
  if (cached?.etag) headers["If-None-Match"] = cached.etag;
  const res = await fetch(url, { headers, signal: AbortSignal.timeout(8000) });
  if (res.status === 304 && cached) return cached.data as T;
  if (!res.ok) throw new GitHubError(res.status, res.status === 429 || (res.status === 403 && res.headers.get("x-ratelimit-remaining") === "0"));
  const data = (await res.json()) as T;
  etags.set(url, { etag: res.headers.get("ETag"), data });
  return data;
}

export async function fetchRoadmapMd(): Promise<string> {
  // raw.githubusercontent is CDN-cached (~5 min) and not API rate limited.
  const res = await fetch(`${ROADMAP_RAW}?t=${Math.floor(Date.now() / 300_000)}`, {
    cache: "no-store",
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new GitHubError(res.status, false);
  return res.text();
}

export async function fetchCommits(token?: string): Promise<Commit[]> {
  type C = { sha: string; html_url: string; author: { login: string } | null; commit: { message: string; author: { name: string; date: string } } };
  const d = await gh<C[]>("/commits?per_page=10", token);
  return d.map((c) => ({
    sha: c.sha,
    msg: (c.commit.message || "").split("\n")[0],
    author: c.author?.login ?? c.commit.author.name,
    date: c.commit.author.date,
    url: c.html_url,
  }));
}

export async function fetchRepo(token?: string): Promise<RepoInfo> {
  type R = {
    stargazers_count: number;
    forks_count: number;
    open_issues_count: number;
    subscribers_count?: number;
    pushed_at: string;
    language: string | null;
    license: { spdx_id: string } | null;
    created_at: string;
  };
  const d = await gh<R>("", token);
  const spdx = d.license?.spdx_id;
  return {
    stars: d.stargazers_count,
    forks: d.forks_count,
    issues: d.open_issues_count,
    watchers: d.subscribers_count ?? 0,
    pushed: d.pushed_at,
    lang: d.language,
    license: spdx && spdx !== "NOASSERTION" ? spdx : null,
    created: d.created_at,
  };
}

export async function fetchSignals(token?: string): Promise<Signals> {
  const d = await gh<{ tree?: { type: string; path: string }[] }>("/git/trees/main?recursive=1", token);
  const map: Signals = {};
  for (const n of d.tree ?? []) {
    if (n.type !== "tree" || !/^(internal|pkg|cmd)\//.test(n.path)) continue;
    const k = n.path.split("/").pop()!.toLowerCase();
    map[k] ??= n.path;
  }
  return map;
}

export async function fetchFileCommit(token?: string): Promise<{ sha: string; date: string; url: string } | null> {
  type C = { sha: string; html_url: string; commit: { author: { date: string } } };
  const d = await gh<C[]>("/commits?path=ROADMAP.md&per_page=1", token);
  return d[0] ? { sha: d[0].sha, date: d[0].commit.author.date, url: d[0].html_url } : null;
}

export async function fetchRelease(token?: string): Promise<Release | null> {
  try {
    const d = await gh<{ tag_name: string; published_at: string }>("/releases/latest", token);
    return { tag: d.tag_name, date: d.published_at };
  } catch (e) {
    if (!(e instanceof GitHubError) || e.status !== 404) throw e;
    const tags = await gh<{ name: string }[]>("/tags?per_page=1", token);
    return tags[0] ? { tag: tags[0].name, date: null } : null;
  }
}

export async function fetchContributors(token?: string): Promise<Contributor[]> {
  type C = { login: string; avatar_url: string; html_url: string; contributions: number; type: string };
  const d = await gh<C[]>("/contributors?per_page=30", token);
  return d
    .filter((c) => c.type !== "Bot")
    .map((c) => ({
      login: c.login,
      avatar: `${c.avatar_url}${c.avatar_url.includes("?") ? "&" : "?"}s=48`,
      url: c.html_url,
      n: c.contributions,
    }));
}

/** Weekly commit totals for the last year; null while GitHub is still computing them (HTTP 202). */
export async function fetchActivity(token?: string): Promise<Week[] | null> {
  const headers: Record<string, string> = { ...API_HEADERS };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${API}/stats/commit_activity`, { headers, signal: AbortSignal.timeout(8000) });
  if (res.status === 202) return null;
  if (!res.ok) throw new GitHubError(res.status, res.status === 429 || (res.status === 403 && res.headers.get("x-ratelimit-remaining") === "0"));
  const d = (await res.json()) as { total: number; week: number }[];
  return Array.isArray(d) ? d.map((w) => ({ t: w.total, week: w.week })) : [];
}
