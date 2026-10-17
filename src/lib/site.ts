export const REPO = "https://github.com/admirable-oss/hive";
export const REPO_SLUG = "admirable-oss/hive";

export const INSTALL_URL = "https://hive.admir-saheta.com/install.sh";
export const INSTALL_COMMAND = `curl -fsSL ${INSTALL_URL} | sh`;
export const INSTALL_PS1_URL = "https://hive.admir-saheta.com/install.ps1";
export const INSTALL_PS1_COMMAND = `irm ${INSTALL_PS1_URL} | iex`;

export type InstallMethodId = "default" | "brew" | "nix" | "windows";

export const INSTALL_METHODS: readonly {
  id: InstallMethodId;
  label: string;
  command: string;
  display: string;
  /** Shell prompt shown before the command; defaults to `$`. */
  prompt?: string;
}[] = [
  {
    id: "default",
    label: "default",
    command: INSTALL_COMMAND,
    display: INSTALL_COMMAND,
  },
  {
    id: "brew",
    label: "brew",
    command: "brew tap admirable-oss/tap && brew install hive-agents",
    display: "brew tap admirable-oss/tap && brew install hive-agents",
  },
  {
    id: "nix",
    label: "nix",
    command: "nix run github:admirable-oss/hive",
    display: "nix run github:admirable-oss/hive",
  },
  {
    id: "windows",
    label: "windows",
    command: INSTALL_PS1_COMMAND,
    display: INSTALL_PS1_COMMAND,
    prompt: "PS>",
  },
] as const;

export const LINKS = {
  docs: `/docs`,
  demo: "/demo",
  /** Install instructions on GitHub (legacy CTA targets). */
  install: `${REPO}#install`,
  getStarted: "/docs/getting-started/quick-start/",
  changelog: `${REPO}/releases`,
  roadmap: "/roadmap",
  pricing: "/pricing",
  plugins: "/plugins",
  privacy: "/privacy",
  terms: "/terms",
  github: REPO,
  brand: "/brand",
  author: "https://admir-saheta.com",
} as const;

export type NavLinkItem = {
  label: string;
  description: string;
  href: string;
  external?: boolean;
};

export type NavLinkGroup = {
  label: string;
  links: readonly NavLinkItem[];
};

export const PRODUCT_NAV = {
  groups: [
    {
      label: "Explore",
      links: [
        {
          label: "Overview",
          description: "Meet Hive and explore the agent runtime.",
          href: LINKS.docs,
        },
        {
          label: "Features",
          description: "Persistent sessions, remote machines, and agent orchestration.",
          href: `${LINKS.docs}/getting-started/core-concepts/`,
        },
      ],
    },
    {
      label: "Experience",
      links: [
        {
          label: "Try it live",
          description: "Run the terminal UI in your browser.",
          href: LINKS.demo,
        },
      ],
    },
    {
      label: "Build",
      links: [
        {
          label: "Integrations",
          description: "Claude Code, Codex, OpenCode, and other CLI agents.",
          href: `${LINKS.docs}/ref/integrations/`,
        },
      ],
    },
  ],
  feature: {
    kicker: "Built for developers",
    title: "Your agents don’t clock out.",
    description:
      "Run coding agents across machines, disconnect without losing your sessions, and return when the work is done.",
    href: LINKS.docs,
    cta: "Explore Hive",
  },
} as const satisfies { groups: readonly NavLinkGroup[]; feature: Record<string, string> };

export const RESOURCES_NAV = {
  groups: [
    {
      label: "Learn",
      links: [
        {
          label: "Documentation",
          description: "Installation, configuration, and guides.",
          href: LINKS.docs,
        },
        {
          label: "API reference",
          description: "Integrate with Hive through its socket API.",
          href: `${LINKS.docs}/ref/api-reference/`,
        },
      ],
    },
    {
      label: "Extend",
      links: [
        {
          label: "Plugins",
          description: "Extend Hive with integrations and custom functionality.",
          href: LINKS.plugins,
        },
      ],
    },
    {
      label: "Follow",
      links: [
        {
          label: "Changelog",
          description: "Follow releases, improvements, and fixes.",
          href: LINKS.changelog,
          external: true,
        },
        {
          label: "Roadmap",
          description: "Explore what’s planned and what’s coming next.",
          href: LINKS.roadmap,
        },
      ],
    },
  ],
  releaseFallback:
    "Persistent agent sessions, remote machines, and a stable wire API for the 1.x release series.",
} as const satisfies { groups: readonly NavLinkGroup[]; releaseFallback: string };

export const MENU_LINKS = [
  { label: "Overview", detail: "Meet the agent runtime", href: LINKS.docs, section: "Product" },
  { label: "Features", detail: "Sessions & orchestration", href: `${LINKS.docs}/getting-started/core-concepts/`, section: "Product" },
  { label: "Try it live", detail: "Browser demo", href: LINKS.demo, section: "Product" },
  { label: "Integrations", detail: "CLI agents & hooks", href: `${LINKS.docs}/ref/integrations/`, section: "Product" },
  { label: "Documentation", detail: "Install & configure", href: LINKS.docs, section: "Resources" },
  { label: "API reference", detail: "Socket API", href: `${LINKS.docs}/ref/api-reference/`, section: "Resources" },
  { label: "Plugins", detail: "Extend the hive", href: LINKS.plugins, section: "Resources" },
  { label: "Changelog", detail: "What shipped", href: LINKS.changelog, section: "Resources" },
  { label: "Roadmap", detail: "RFCs & what’s next", href: LINKS.roadmap, section: "Resources" },
  { label: "Pricing", detail: "Free forever, self-hosted", href: LINKS.pricing, section: "Site" },
  { label: "Get started", detail: "Quick start", href: LINKS.getStarted, section: "Site" },
  { label: "GitHub", detail: "admirable-oss/hive", href: LINKS.github, section: "Site" },
  { label: "Brand", detail: "Book & assets", href: LINKS.brand, section: "Site" },
  { label: "Privacy", detail: "Data & telemetry", href: LINKS.privacy, section: "Legal" },
  { label: "Terms", detail: "Software & license terms", href: LINKS.terms, section: "Legal" },
] as const;

export const VERSION_LABEL = "v1.0.0-rc.1";
export const LICENSE_LABEL = "Apache-2.0";
export const LANGUAGE_LABEL = "Go";

/** Below this the GitHub button shows no star count (no manufactured social proof). */
export const STAR_THRESHOLD = 100;

export const SUPPORTED_AGENTS = ["claude", "codex", "aider"] as const;
