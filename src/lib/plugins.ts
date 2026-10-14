export interface PluginRelease {
  version: string;
  ref: string;
  commit: string;
  checksum: string;
  changelog?: string;
  published_at: string;
  subdir?: string;
}

export interface HivePlugin {
  id: string;
  name: string;
  description?: string;
  screenshots?: string[];
  installation?: string;
  configuration?: string;
  categories?: string[];
  maintainers: { name: string; url?: string }[];
  license: string;
  repository: string;
  documentation?: string;
  issues?: string;
  platforms?: string[];
  min_hive_version?: string;
  max_hive_version?: string;
  plugin_api?: string;
  featured?: boolean;
  official?: boolean;
  verified?: boolean;
  deprecated?: boolean;
  archived?: boolean;
  releases: PluginRelease[];
}

export interface PluginRegistry {
  schema: 1;
  plugins: HivePlugin[];
}

export function latestRelease(plugin: HivePlugin) {
  return [...plugin.releases].sort((a, b) => Date.parse(b.published_at) - Date.parse(a.published_at))[0];
}

export function categoryLabel(category: string) {
  return ({ "agent-integrations": "Agent integrations", "workflow-automation": "Workflow automation", "developer-tools": "Developer tools", notifications: "Notifications", "terminal-enhancements": "Terminal enhancements" } as Record<string, string>)[category] ?? category.replaceAll("-", " ");
}


/** Validate registry schema v1 using the same release contract as the Hive CLI. */
export function validatePluginRegistry(data: unknown): PluginRegistry {
  if (!data || typeof data !== "object" || (data as PluginRegistry).schema !== 1 || !Array.isArray((data as PluginRegistry).plugins)) {
    throw new Error("Registry does not match schema version 1");
  }

  const ids = new Set<string>();
  const versionPattern = /^v?\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/;
  const versionTuple = (value: string) => {
    const match = /^(?:v)?(\d+)\.(\d+)\.(\d+)/.exec(value);
    return match ? match.slice(1, 4).map(Number) : null;
  };
  const isHTTPSURL = (value: string) => {
    try {
      const url = new URL(value);
      return url.protocol === "https:" && Boolean(url.hostname) && !url.username && !url.password && !url.hash;
    } catch {
      return false;
    }
  };

  for (const plugin of (data as PluginRegistry).plugins) {
    if (!plugin || typeof plugin.id !== "string" || !/^[a-z][a-z0-9-]{1,62}$/.test(plugin.id) ||
      ids.has(plugin.id) || typeof plugin.name !== "string" || !plugin.name.trim() ||
      typeof plugin.license !== "string" || !plugin.license.trim() ||
      typeof plugin.repository !== "string" || !isHTTPSURL(plugin.repository) ||
      !Array.isArray(plugin.maintainers) || plugin.maintainers.length === 0 ||
      !Array.isArray(plugin.releases) || !plugin.releases.length) {
      throw new Error("Registry contains an invalid or duplicate plugin entry");
    }
    ids.add(plugin.id);
    if (plugin.maintainers.some((maintainer) => !maintainer || typeof maintainer.name !== "string" ||
      !maintainer.name.trim() || (maintainer.url && !isHTTPSURL(maintainer.url)))) {
      throw new Error(`Plugin ${plugin.id} has invalid maintainer metadata`);
    }
    for (const link of [...(plugin.screenshots ?? []), plugin.documentation, plugin.issues]) {
      if (link && !isHTTPSURL(link)) throw new Error(`Plugin ${plugin.id} contains a non-HTTPS link`);
    }
    if ((plugin.min_hive_version && !versionPattern.test(plugin.min_hive_version)) ||
      (plugin.max_hive_version && !versionPattern.test(plugin.max_hive_version))) {
      throw new Error(`Plugin ${plugin.id} has an invalid Hive compatibility range`);
    }
    if (plugin.min_hive_version && plugin.max_hive_version) {
      const min = versionTuple(plugin.min_hive_version)!;
      const max = versionTuple(plugin.max_hive_version)!;
      const order = min.findIndex((part, index) => part !== max[index]);
      if (order >= 0 && min[order] > max[order]) throw new Error(`Plugin ${plugin.id} has a reversed Hive compatibility range`);
    }
    if (plugin.platforms && (!Array.isArray(plugin.platforms) || plugin.platforms.some((platform) => !["darwin", "linux"].includes(platform)))) {
      throw new Error(`Plugin ${plugin.id} has an unsupported platform`);
    }
    const versions = new Set<string>();
    for (const release of plugin.releases) {
      if (!release || typeof release.version !== "string" || !versionPattern.test(release.version) ||
        typeof release.ref !== "string" || release.ref.replace(/^v/, "") !== release.version.replace(/^v/, "") ||
        versions.has(release.version) || !/^[\da-f]{40}$/i.test(release.commit) ||
        !/^sha256:[\da-f]{64}$/i.test(release.checksum) || typeof release.published_at !== "string" ||
        !Number.isFinite(Date.parse(release.published_at)) ||
        (release.subdir !== undefined && (!release.subdir || release.subdir.startsWith("/") ||
          release.subdir.includes("\\") || release.subdir.split("/").some((part) => !part || part === "." || part === "..")))) {
        throw new Error(`Plugin ${plugin.id} has an invalid release record`);
      }
      versions.add(release.version);
    }
  }
  return data as PluginRegistry;
}
