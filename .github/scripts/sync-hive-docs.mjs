#!/usr/bin/env node
// Brings Hive's repository docs onto the website. Pages listed in PAGES are
// generated from the hive checkout (never edit them here; edit the source in
// admirable-oss/hive), the roadmap snapshot and the plugin registry's
// revocations are copied, and links between docs become links between pages.
//
//   node .github/scripts/sync-hive-docs.mjs ../hive
//
// Every page is written as MDX, so prose is escaped where MDX would read it
// as JSX: braces, stray angle brackets, HTML comments and autolinks.
//
// Hand-written pages (quick start, observers, …) are not generated; links to
// their sources are pointed at them through CURATED.
import { mkdirSync, readFileSync, writeFileSync, existsSync, rmSync } from 'node:fs';
import { dirname, join, posix } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = 'https://github.com/admirable-oss/hive';
const site = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

// Generated pages: source in the hive repository → page under /docs/.
export const PAGES = [
  { src: 'docs/workflows.md', slug: 'use/workflows', title: 'Workflows', description: 'Reusable TOML workflows of agent tasks, commands and plugin steps, fired by events, schedules, git pushes and webhooks, and run headless in CI.' },
  { src: 'docs/teams.md', slug: 'use/teams', title: 'Teams', description: 'Let teammates into your runtime over ssh with a role, see who is where, take turns typing, and hand agents and tasks over.' },
  { src: 'docs/discovery.md', slug: 'use/discovery', title: 'Local Discovery', description: 'Find Hive runtimes on your local network and pair with them after proving their identity.' },
  { src: 'docs/desktop.md', slug: 'use/desktop', title: 'Desktop App (Preview)', description: 'Hive on macOS, Windows and Linux in a native window, with the runtime you already use underneath.' },
  { src: 'docs/plugins/api.md', slug: 'config/plugin-api', title: 'Plugin API', description: 'The versioned contract between Hive and its plugins: manifests, capabilities, events, actions, sandboxing, WebAssembly, views, workflow steps, forges and trackers.' },
  { src: 'docs/plugins/publishing.md', slug: 'config/plugin-publishing', title: 'Publishing Plugins', description: 'Sign, record and submit a plugin release with hive plugin publish, and test it against any Hive release.' },
  { src: 'docs/plugins/typescript-sdk.md', slug: 'config/typescript-sdk', title: 'TypeScript Plugin SDK', description: 'Write Hive plugins in TypeScript with typed contexts, events, actions and contributions.' },
  { src: 'docs/plugins/governance.md', slug: 'config/registry-governance', title: 'Registry Governance', description: 'How plugins are submitted, reviewed, transferred, reported, appealed and withdrawn.' },
  { src: 'docs/plugins/ecosystem.md', slug: 'config/plugin-ecosystem', title: 'Plugin Ecosystem Health', description: 'Policies for abandoned, compromised, deprecated and removed plugins, revoking releases, and guidance for maintainers.' },
  { src: 'internal/config/testdata/config-reference.md', slug: 'config/config-reference', title: 'Configuration Reference', description: 'Every section and key of Hive\'s config.toml, with its default and what it does.' },
  { src: 'internal/runtime/tests/testdata/api-reference.md', slug: 'ref/api-reference', title: 'API Reference', description: 'Complete generated reference for Hive\'s stable wire API: every method, event and type.' },
  { src: 'docs/compatibility.md', slug: 'ref/compatibility-matrix', title: 'Compatibility Matrix', description: 'What works with what across the 1.x release train: API levels, plugin and observer APIs, state schemas and deprecations.' },
  { src: 'docs/threat-model.md', slug: 'ref/threat-model', title: 'Threat Model', description: 'What Hive protects, from whom, where its trust boundaries are, and what it does not try to do.' },
  { src: 'SECURITY.md', slug: 'ref/security', title: 'Security Policy', description: 'How to report a vulnerability, which versions get fixes, and how Hive protects you.' },
  { src: 'docs/security-review.md', slug: 'ref/security-review', title: 'Security Review: v1.0.10', description: 'The release-quality security review of the 1.0 train: what was checked, found, fixed and left open.' },
  { src: 'docs/upgrading.md', slug: 'help/upgrading', title: 'Upgrading and Recovery', description: 'Upgrade Hive on every install path, understand failed upgrades, roll back, and recover damaged state.' },
  { src: 'docs/operations.md', slug: 'help/operations', title: 'Operating Hive', description: 'Backups, logs and retention, diagnosing failed sessions, remote runtimes, and feature maturity.' },
  { src: 'GOVERNANCE.md', slug: 'community/governance', title: 'Governance', description: 'Roles, decisions, breaking changes, releases, support and deprecation in the Hive project.' },
  { src: 'CONTRIBUTING.md', slug: 'community/contributing', title: 'Contributing', description: 'Build, test and lint Hive, and the conventions its code follows.' },
  { src: 'docs/releasing.md', slug: 'community/releasing', title: 'Releasing Hive', description: 'What a release contains, how one is cut and gated, the self-hosted runner, and how to verify a release.' },
  { src: 'rfcs/README.md', slug: 'community/rfcs', title: 'RFCs', description: 'How substantial changes to Hive are proposed, discussed and decided.' },
  { src: 'rfcs/0001-after-1.0.10.md', slug: 'community/rfc-0001', title: 'RFC 0001: The Roadmap After 1.0.10', description: 'The proposed roadmap after the 1.0 train, open for comment.' },
  { src: 'rfcs/0002-task-orchestration.md', slug: 'community/rfc-0002', title: 'RFC 0002: Tasks and Plans', description: 'Parallel agent orchestration: plans of tasks with ordering, limits, placement, approvals and results (M22).' },
  { src: 'rfcs/0003-git-native-development.md', slug: 'community/rfc-0003', title: 'RFC 0003: Branches, From Worktree to Merge', description: 'Git-native development: branch lifecycle, overlaps and conflicts, review, gates and publishing by consent (M23).' },
  { src: 'rfcs/0004-workflow-automation.md', slug: 'community/rfc-0004', title: 'RFC 0004: Workflows, From a Trigger to a Report', description: 'Workflow automation: triggers, steps, expressions, retries, run history and headless CI runs (M24).' },
  { src: 'rfcs/0005-agent-insights.md', slug: 'community/rfc-0005', title: 'RFC 0005: Agent Insights, on Your Machine', description: 'Time in state, reported usage and budgets for every agent, kept locally (M25).' },
  { src: 'rfcs/0006-plugin-ecosystem-2.md', slug: 'community/rfc-0006', title: 'RFC 0006: Plugin Ecosystem 2', description: 'Plugin API 2, sandboxing by default, WebAssembly, pane views, registry schema 2 and signed releases (M26).' },
  { src: 'rfcs/0007-team-collaboration.md', slug: 'community/rfc-0007', title: 'RFC 0007: Team Collaboration, Over ssh', description: 'Members, roles, presence, one typist per pane and handing work over, with nothing hosted (M27).' },
];

// Hand-written pages whose sources other docs link to.
const CURATED = {
  'docs/observers.md': 'use/observers',
  'docs/web.md': 'use/web-observer',
  'docs/mobile.md': 'use/mobile',
  'docs/platforms.md': 'getting-started/platforms',
  'docs/plugins/image-graphics.md': 'use/images',
  'docs/tasks.md': 'use/plans',
  'docs/branches.md': 'use/branches',
  'api/v1/README.md': 'ref/compatibility',
};

const pageOf = new Map([
  ...PAGES.map((p) => [p.src, `/docs/${p.slug}/`]),
  ...Object.entries(CURATED).map(([src, slug]) => [src, `/docs/${slug}/`]),
  ['ROADMAP.md', '/roadmap/'],
]);

// rewriteLink turns a link in source file `from` into a site page, or into
// the file on GitHub when the site has no page for it.
function rewriteLink(from, target) {
  if (/^([a-z]+:|#|\/)/i.test(target)) return target;
  const [path, anchor] = target.split('#');
  const resolved = posix.normalize(posix.join(posix.dirname(from), path)).replace(/^\.\//, '');
  const page = pageOf.get(resolved);
  if (page) return anchor ? `${page}#${anchor}` : page;
  const kind = resolved.endsWith('/') || !posix.extname(resolved) ? 'tree' : 'blob';
  return `${REPO}/${kind}/main/${resolved.replace(/\/$/, '')}${anchor ? `#${anchor}` : ''}`;
}

// HTML that MDX renders as-is; any other `<` in prose is text.
const HTML_TAG = /^<\/?(?:kbd|details|summary|sup|sub|b|i|em|strong|code|a|p|div|span|img|br)(?:\s[^<>]*)?\/?>/i;

// escapeProse makes a run of Markdown prose (no code spans) safe for MDX.
// `state.comment` carries an HTML comment that spans lines.
export function escapeProse(text, state = { comment: false }) {
  let out = '';
  let i = 0;
  while (i < text.length) {
    if (state.comment) {
      const end = text.indexOf('-->', i);
      if (end < 0) return out + text.slice(i);
      out += `${text.slice(i, end).trimEnd()} */}`;
      i = end + 3;
      state.comment = false;
      continue;
    }
    const rest = text.slice(i);
    if (rest.startsWith('<!--')) {
      out += '{/* ';
      i += 4;
      while (text[i] === ' ') i++;
      state.comment = true;
      continue;
    }
    const auto = rest.match(/^<((?:https?|mailto):[^\s<>]+|[^\s<>@]+@[^\s<>@]+\.[a-z]+)>/i);
    if (auto) {
      const href = /^[a-z]+:/i.test(auto[1]) ? auto[1] : `mailto:${auto[1]}`;
      out += `[${auto[1]}](${href})`;
      i += auto[0].length;
      continue;
    }
    const tag = rest.match(HTML_TAG);
    if (tag) {
      out += /^<br\b/i.test(tag[0]) ? '<br />' : tag[0];
      i += tag[0].length;
      continue;
    }
    const c = text[i];
    out += c === '<' ? '&lt;' : c === '{' ? '\\{' : c === '}' ? '\\}' : c;
    i++;
  }
  return out;
}

// toMdx escapes Markdown for MDX outside fenced code and code spans, and
// passes each prose run through `prose` first (link rewriting, say).
export function toMdx(text, prose = (s) => s) {
  const out = [];
  const state = { comment: false };
  let fence = null;
  let block = [];
  // Code spans may wrap lines, so prose is escaped a paragraph at a time.
  const flush = () => {
    if (!block.length) return;
    const escaped = block
      .join('\n')
      .split(/(\n[ \t]*\n)/)
      .map((para) =>
        para
          .split(/(``[^]+?``|`[^`]+`)/)
          .map((part, n) => (n % 2 ? part : escapeProse(prose(part), state)))
          .join(''),
      )
      .join('');
    out.push(escaped);
    block = [];
  };
  for (const line of text.split('\n')) {
    const marker = line.match(/^\s*(```+|~~~+)/);
    if (fence) {
      if (marker && marker[1][0] === fence[0] && marker[1].length >= fence.length && !line.trim().slice(marker[1].length).trim()) fence = null;
      out.push(line);
      continue;
    }
    if (marker && !state.comment) {
      flush();
      fence = marker[1];
      out.push(line);
      continue;
    }
    block.push(line);
  }
  flush();
  return out.join('\n');
}

// convert drops the H1 (Starlight titles the page from its frontmatter),
// rewrites links between docs, and escapes the rest for MDX.
function convert(src, text) {
  let fence = false;
  const lines = text.split('\n');
  const h1 = lines.findIndex((line) => {
    if (/^\s*(```|~~~)/.test(line)) fence = !fence;
    return !fence && /^# /.test(line);
  });
  if (h1 >= 0) lines.splice(h1, 1);
  const links = (s) => s.replace(/\]\(([^)\s]+)\)/g, (_, t) => `](${rewriteLink(src, t)})`);
  return toMdx(lines.join('\n'), links).replace(/^\n+/, '');
}

function main() {
  const hive = process.argv[2];
  if (!hive || !existsSync(join(hive, 'ROADMAP.md'))) {
    console.error('usage: sync-hive-docs.mjs <hive checkout>');
    process.exit(2);
  }

  const yaml = (s) => JSON.stringify(s);
  let written = 0;
  for (const p of PAGES) {
    const text = readFileSync(join(hive, p.src), 'utf8');
    const page = [
      '---',
      `title: ${yaml(p.title)}`,
      `description: ${yaml(p.description)}`,
      `source: ${REPO}/blob/main/${p.src}`,
      '---',
      '',
      `{/* Generated from ${p.src} in admirable-oss/hive by .github/scripts/sync-hive-docs.mjs. Edit it there. */}`,
      '',
      convert(p.src, text),
    ].join('\n');
    const base = join(site, 'src/content/docs/docs', p.slug);
    mkdirSync(dirname(base), { recursive: true });
    // Pages were Markdown before; two files for one slug would collide.
    rmSync(`${base}.md`, { force: true });
    writeFileSync(`${base}.mdx`, page.endsWith('\n') ? page : `${page}\n`);
    written++;
  }

  // The roadmap page reads ROADMAP.md from GitHub; this is its offline snapshot.
  writeFileSync(join(site, 'src/data/ROADMAP.md'), readFileSync(join(hive, 'ROADMAP.md')));
  // Plugin release revocations, served beside the catalog.
  writeFileSync(join(site, 'public/plugins/revocations.json'), readFileSync(join(hive, 'registry/revocations.json')));

  console.log(`synced ${written} pages, the roadmap snapshot and plugin revocations from ${hive}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
