import { GITHUB_TOKEN, HIVE_PLUGIN_REGISTRY_URL } from "astro:env/server";
import type { HivePlugin, PluginRegistry, PluginRelease } from "./plugins";

const DEFAULT_REGISTRY_URL = "https://hive.admir-saheta.com/plugins/registry.json";
const GITHUB_API_URL = "https://api.github.com";
const CACHE_TTL_MS = 5 * 60 * 1000;
const registryUrl = HIVE_PLUGIN_REGISTRY_URL ?? DEFAULT_REGISTRY_URL;

type GitHubGitObject = {
  sha: string;
  type: string;
};

type GitHubReference = {
  object: GitHubGitObject;
};

let cachedRegistry: { expiresAt: number; promise: Promise<VerifiedRegistry> } | null = null;

type VerifiedRegistry = {
  registry: PluginRegistry;
  error: string | null;
};

function getRepositorySlug(repository: string) {
  let url: URL;
  try {
    url = new URL(repository);
  } catch {
    throw new Error(`Plugin repository is not a valid URL: ${repository}`);
  }

  const segments = url.pathname.split("/").filter(Boolean);
  if (
    url.protocol !== "https:" ||
    url.hostname !== "github.com" ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    segments.length !== 2
  ) {
    throw new Error(`Plugin repository must be a public GitHub repository: ${repository}`);
  }

  return segments.join("/");
}

function validateRegistry(data: unknown): PluginRegistry {
  if (!data || typeof data !== "object" || (data as PluginRegistry).schema !== 1 || !Array.isArray((data as PluginRegistry).plugins)) {
    throw new Error("Registry does not match schema version 1");
  }

  const ids = new Set<string>();
  for (const plugin of (data as PluginRegistry).plugins) {
    if (!plugin || typeof plugin.id !== "string" || ids.has(plugin.id) || !Array.isArray(plugin.releases) || !plugin.releases.length) {
      throw new Error("Registry contains an invalid or duplicate plugin entry");
    }

    ids.add(plugin.id);
    getRepositorySlug(plugin.repository);

    const versions = new Set<string>();
    for (const release of plugin.releases) {
      if (
        !release.version ||
        !release.ref ||
        versions.has(release.version) ||
        !/^[\da-f]{40}$/i.test(release.commit) ||
        !/^sha256:[\da-f]{64}$/i.test(release.checksum)
      ) {
        throw new Error(`Plugin ${plugin.id} has an invalid release record`);
      }
      versions.add(release.version);
    }
  }

  return data as PluginRegistry;
}

async function githubJson<T>(path: string): Promise<T> {
  const request = (authenticated: boolean) => fetch(`${GITHUB_API_URL}${path}`, {
    headers: {
      accept: "application/vnd.github+json",
      ...(authenticated && GITHUB_TOKEN ? { authorization: `Bearer ${GITHUB_TOKEN}` } : {}),
      "user-agent": "hive-plugin-store",
    },
    signal: AbortSignal.timeout(7000),
  });

  let response = await request(true);
  if ((response.status === 401 || response.status === 403) && GITHUB_TOKEN) {
    response = await request(false);
  }

  if (!response.ok) {
    throw new Error(`GitHub returned HTTP ${response.status} for ${path}`);
  }

  return response.json() as Promise<T>;
}

async function resolveTagCommit(repository: string, ref: string) {
  let object: GitHubGitObject = (
    await githubJson<GitHubReference>(`/repos/${repository}/git/ref/tags/${encodeURIComponent(ref)}`)
  ).object;

  for (let depth = 0; depth < 3 && object.type === "tag"; depth += 1) {
    object = (await githubJson<GitHubReference>(`/repos/${repository}/git/tags/${object.sha}`)).object;
  }

  if (object.type !== "commit" || !/^[\da-f]{40}$/i.test(object.sha)) {
    throw new Error(`GitHub tag ${ref} does not resolve to a commit`);
  }

  return object.sha;
}

async function verifyRelease(repository: string, release: PluginRelease) {
  const resolvedCommit = await resolveTagCommit(repository, release.ref);
  if (resolvedCommit.toLowerCase() !== release.commit.toLowerCase()) {
    throw new Error(`GitHub tag ${release.ref} points to ${resolvedCommit}, not ${release.commit}`);
  }
}

async function verifyPlugin(plugin: HivePlugin) {
  const repository = getRepositorySlug(plugin.repository);
  await Promise.all(plugin.releases.map((release) => verifyRelease(repository, release)));
  return plugin;
}

async function loadVerifiedRegistry(): Promise<VerifiedRegistry> {
  const response = await fetch(registryUrl, {
    headers: { accept: "application/json" },
    signal: AbortSignal.timeout(7000),
  });

  if (!response.ok) {
    throw new Error(`Registry returned HTTP ${response.status}`);
  }

  const registry = validateRegistry(JSON.parse(await response.text()));
  const verified: HivePlugin[] = [];
  const rejected: string[] = [];

  await Promise.all(
    registry.plugins.map(async (plugin) => {
      try {
        verified.push(await verifyPlugin(plugin));
      } catch (error) {
        const reason = error instanceof Error ? error.message : "GitHub verification failed";
        rejected.push(`${plugin.id}: ${reason}`);
        console.warn(`Withholding unverified plugin ${plugin.id}: ${reason}`);
      }
    }),
  );

  if (!verified.length && registry.plugins.length) {
    throw new Error("No published plugin entries passed GitHub tag verification");
  }

  return {
    registry: { schema: 1, plugins: verified },
    error: rejected.length ? `${rejected.length} registry entr${rejected.length === 1 ? "y was" : "ies were"} withheld until GitHub tags can be verified.` : null,
  };
}

export async function getPluginRegistry(): Promise<{ registry: PluginRegistry | null; error: string | null; fetchedAt: string }> {
  const fetchedAt = new Date().toISOString();
  const now = Date.now();

  if (!cachedRegistry || cachedRegistry.expiresAt <= now) {
    cachedRegistry = {
      expiresAt: now + CACHE_TTL_MS,
      promise: loadVerifiedRegistry(),
    };
  }

  try {
    const result = await cachedRegistry.promise;
    return { ...result, fetchedAt };
  } catch (error) {
    cachedRegistry = null;
    return {
      registry: null,
      error: error instanceof Error ? error.message : "Could not load the verified plugin registry",
      fetchedAt,
    };
  }
}
