import { REPO } from "./site";

export interface RepoStats {
  stars: number;
  license: string | null;
  version: string | null;
  language: string | null;
}

const API = REPO.replace("https://github.com/", "https://api.github.com/repos/");

async function getJson<T>(url: string, token?: string): Promise<T | null> {
  try {
    const res = await fetch(url, {
      headers: {
        Accept: "application/vnd.github+json",
        "User-Agent": "hive-web-build",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      signal: AbortSignal.timeout(3000),
    });
    return res.ok ? ((await res.json()) as T) : null;
  } catch {
    return null;
  }
}

/**
 * Real repo numbers, fetched once at build time. Returns null when GitHub
 * is unreachable or the repo isn't public — callers fall back to static copy.
 */
export async function getRepoStats(): Promise<RepoStats | null> {
  const token = import.meta.env.GITHUB_TOKEN as string | undefined;
  const [repo, release] = await Promise.all([
    getJson<{ stargazers_count: number; license: { spdx_id: string } | null; language: string | null }>(API, token),
    getJson<{ tag_name: string }>(`${API}/releases/latest`, token),
  ]);
  if (!repo) return null;
  const spdx = repo.license?.spdx_id;
  return {
    stars: repo.stargazers_count,
    license: spdx && spdx !== "NOASSERTION" ? spdx : null,
    version: release?.tag_name ?? null,
    language: repo.language,
  };
}

/** 1284 → "1.3k", 980 → "980". */
export const formatStars = (n: number) =>
  n >= 1000 ? `${(n / 1000).toFixed(n >= 10_000 ? 0 : 1).replace(/\.0$/, "")}k` : String(n);
