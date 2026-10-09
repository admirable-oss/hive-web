import { LINKS, REPO } from "./site";

/** Primary navigation in the docs header and mobile menu. */
export const DOCS_NAV = [
  { label: "Overview", href: "/" },
  { label: "Docs", href: "/docs/" },
  { label: "Changelog", href: LINKS.changelog, external: true },
  { label: "Roadmap", href: LINKS.roadmap, external: true },
] as const;

export const DOCS_VERSION = "v0 · pre-release";

export const DOCS_FOOTER_LINKS = [
  { label: "GitHub", href: REPO },
  { label: "Roadmap", href: LINKS.roadmap },
  { label: "Contributing", href: `${REPO}/blob/main/CONTRIBUTING.md` },
  { label: "Security", href: `${REPO}/blob/main/SECURITY.md` },
] as const;

/** Hand the docs to your own coding agent. */
export const AGENT_PROMPT =
  "Help me understand and set up Hive. Read https://hive.admir-saheta.com/agent-guide.md first, then walk me through it step by step.";
