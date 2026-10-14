import { GITHUB_TOKEN, HIVE_PLUGIN_REGISTRY_URL } from "astro:env/server";
import { validatePluginRegistry, type HivePlugin, type PluginRegistry, type PluginRelease } from "./plugins";

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

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function resolveTagCommitFromGit(repository: string, ref: string) {
  const response = await fetch(`https://github.com/${repository}.git/info/refs?service=git-upload-pack`, {
    headers: { "user-agent": "hive-plugin-store" },
    signal: AbortSignal.timeout(7000),
  });
  if (!response.ok) {
    throw new Error(`GitHub returned HTTP ${response.status} for Git ref advertisement`);
  }

  const body = await response.text();
  const tag = escapeRegExp(ref);
  const peeled = body.match(new RegExp(`([\\da-f]{40})\\srefs/tags/${tag}\\^\\{\\}`));
  if (peeled) return peeled[1];

  const lightweight = body.match(new RegExp(`([\\da-f]{40})\\srefs/tags/${tag}(?:\\0|\\r?\\n)`));
  if (lightweight) return lightweight[1];

  throw new Error(`GitHub tag ${ref} was not advertised`);
}

async function resolveTagCommit(repository: string, ref: string) {
  try {
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
  } catch (error) {
    console.warn(`GitHub API tag verification unavailable for ${repository}@${ref}; using public Git refs`, error);
    return resolveTagCommitFromGit(repository, ref);
  }
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

  const registry = validatePluginRegistry(JSON.parse(await response.text()));
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
