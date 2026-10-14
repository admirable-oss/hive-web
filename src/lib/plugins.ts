export interface PluginRelease {
  version: string;
  ref: string;
  commit: string;
  checksum: string;
  changelog: string;
  published_at: string;
}

export interface HivePlugin {
  id: string;
  name: string;
  description: string;
  screenshots?: string[];
  installation?: string;
  configuration?: string;
  categories: string[];
  maintainers: { name: string; url?: string }[];
  license: string;
  repository: string;
  documentation?: string;
  issues?: string;
  platforms: string[];
  min_hive_version: string;
  plugin_api: string;
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
