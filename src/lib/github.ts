import { REPO_SLUG } from "./site";

export interface RepoStats {
  stars: number;
  forks: number;
  license: string | null;
  version: string | null;
  language: string | null;
  releaseHighlight: string | null;
}

export const GITHUB_API_VERSION = "2026-03-10";
export const GITHUB_REPO_API = `https://api.github.com/repos/${REPO_SLUG}`;

const API_HEADERS = (token?: string) => ({
  Accept: "application/vnd.github+json",
  "X-GitHub-Api-Version": GITHUB_API_VERSION,
  "User-Agent": "hive-web-build (+https://hive.admir-saheta.com)",
  ...(token ? { Authorization: `Bearer ${token}` } : {}),
});

/** First readable sentence from a GitHub release body (markdown stripped). */
export function releaseHighlightFromBody(body: string | null | undefined): string | null {
  if (!body?.trim()) return null;
  const line =
    body
      .split("\n")
      .map((l) => l.replace(/^#+\s*/, "").replace(/^\*\s*/, "").replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").trim())
      .find((l) => l.length > 0) ?? "";
  if (!line) return null;
  return line.length > 160 ? `${line.slice(0, 157)}…` : line;
}

async function getJson<T>(url: string, token?: string): Promise<T | null> {
  try {
    const res = await fetch(url, {
      headers: API_HEADERS(token),
      signal: AbortSignal.timeout(5000),
    });
    return res.ok ? ((await res.json()) as T) : null;
  } catch {
    return null;
  }
}

type RepoPayload = {
  stargazers_count: number;
  forks_count: number;
  license: { spdx_id: string } | null;
  language: string | null;
};

type ReleasePayload = { tag_name: string; body: string | null };

/**
 * GET /repos/{owner}/{repo} plus latest release — used at build time and in
 * Astro Actions for client refresh.
 */
export async function fetchRepoStats(): Promise<RepoStats | null> {
  const token = import.meta.env.GITHUB_TOKEN as string | undefined;
  const [repo, release] = await Promise.all([
    getJson<RepoPayload>(GITHUB_REPO_API, token),
    getJson<ReleasePayload>(`${GITHUB_REPO_API}/releases/latest`, token),
  ]);
  if (!repo) return null;
  const spdx = repo.license?.spdx_id;
  return {
    stars: repo.stargazers_count,
    forks: repo.forks_count,
    license: spdx && spdx !== "NOASSERTION" ? spdx : null,
    version: release?.tag_name ?? null,
    language: repo.language,
    releaseHighlight: releaseHighlightFromBody(release?.body),
  };
}

/**
 * Real repo numbers, fetched once at build time. Returns null when GitHub
 * is unreachable or the repo isn't public — callers fall back to static copy.
 */
export async function getRepoStats(): Promise<RepoStats | null> {
  return fetchRepoStats();
}

/** 1284 → "1.3k", 980 → "980". */
export const formatStars = (n: number) =>
  n >= 1000 ? `${(n / 1000).toFixed(n >= 10_000 ? 0 : 1).replace(/\.0$/, "")}k` : String(n);
