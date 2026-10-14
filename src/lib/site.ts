export const REPO = "https://github.com/admirable-oss/hive";

export const INSTALL_URL = "https://hive.admir-saheta.com/install.sh";
export const INSTALL_COMMAND = `curl -fsSL ${INSTALL_URL} | sh`;

export const LINKS = {
  docs: `/docs`,
  demo: "/demo",
  install: `${REPO}#install`,
  changelog: `${REPO}/releases`,
  roadmap: "/roadmap",
  pricing: "/pricing",
  github: REPO,
  brand: "/brand",
  author: "https://admir-saheta.com",
} as const;

export const NAV_LINKS = [
  { label: "Docs", href: LINKS.docs },
  { label: "Changelog", href: LINKS.changelog },
  { label: "Roadmap", href: LINKS.roadmap },
  { label: "Pricing", href: LINKS.pricing },
] as const;

export const MENU_LINKS = [
  { label: "Docs", detail: "Read the manual", href: LINKS.docs },
  { label: "Changelog", detail: "What shipped", href: LINKS.changelog },
  { label: "Roadmap", detail: "RFCs & what’s next", href: LINKS.roadmap },
  { label: "Pricing", detail: "Free forever, self-hosted", href: LINKS.pricing },
  { label: "GitHub", detail: "admirable-oss/hive", href: LINKS.github },
  { label: "Brand", detail: "Book & assets", href: LINKS.brand },
] as const;

export const VERSION_LABEL = "v1.0.0-rc.1";
export const LICENSE_LABEL = "Apache-2.0";
export const LANGUAGE_LABEL = "Go";

/** Below this the GitHub button shows no star count (no manufactured social proof). */
export const STAR_THRESHOLD = 100;

export const SUPPORTED_AGENTS = ["claude", "codex", "aider"] as const;
