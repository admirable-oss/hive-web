export const REPO = "https://github.com/admirable-oss/hive";

export const CLONE_DISPLAY = "git clone github.com/admirable-oss/hive";
export const CLONE_COMMAND = `git clone ${REPO}`;

export const LINKS = {
  docs: `${REPO}#readme`,
  install: `${REPO}#install`,
  changelog: `${REPO}/releases`,
  roadmap: `${REPO}/issues`,
  github: REPO,
  brand: "/brand",
  author: "https://admir-saheta.com",
} as const;

export const NAV_LINKS = [
  { label: "Docs", href: LINKS.docs },
  { label: "Changelog", href: LINKS.changelog },
  { label: "Roadmap", href: LINKS.roadmap },
  { label: "Brand", href: LINKS.brand },
] as const;

export const MENU_LINKS = [
  { label: "Docs", detail: "Read the manual", href: LINKS.docs },
  { label: "Changelog", detail: "What shipped", href: LINKS.changelog },
  { label: "Roadmap", detail: "RFCs & what’s next", href: LINKS.roadmap },
  { label: "GitHub", detail: "admirable-oss/hive", href: LINKS.github },
  { label: "Brand", detail: "Book & assets", href: LINKS.brand },
] as const;

export const VERSION_LABEL = "v0.1 alpha";

export const SUPPORTED_AGENTS = ["claude", "codex", "aider"] as const;
