#!/usr/bin/env node
// Brings Hive's repository docs onto the website. Pages listed in PAGES are
// generated from the hive checkout (never edit them here; edit the source in
// admirable-oss/hive), the roadmap snapshot and the plugin registry's
// revocations are copied, and links between docs become links between pages.
//
//   node .github/scripts/sync-hive-docs.mjs ../hive
//
// Hand-written pages (quick start, observers, …) are not generated; links to
// their sources are pointed at them through CURATED.
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join, posix } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = 'https://github.com/admirable-oss/hive';
const site = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const hive = process.argv[2];
if (!hive || !existsSync(join(hive, 'ROADMAP.md'))) {
  console.error('usage: sync-hive-docs.mjs <hive checkout>');
  process.exit(2);
}

// Generated pages: source in the hive repository → page under /docs/.
export const PAGES = [
  { src: 'docs/discovery.md', slug: 'use/discovery', title: 'Local Discovery', description: 'Find Hive runtimes on your local network and pair with them after proving their identity.' },
  { src: 'docs/desktop.md', slug: 'use/desktop', title: 'Desktop App (Preview)', description: 'Hive on macOS, Windows and Linux in a native window, with the runtime you already use underneath.' },
  { src: 'docs/plugins/typescript-sdk.md', slug: 'config/typescript-sdk', title: 'TypeScript Plugin SDK', description: 'Write Hive plugins in TypeScript with typed contexts, events, actions and contributions.' },
  { src: 'docs/plugins/governance.md', slug: 'config/registry-governance', title: 'Registry Governance', description: 'How plugins are submitted, reviewed, transferred, reported, appealed and withdrawn.' },
  { src: 'docs/plugins/ecosystem.md', slug: 'config/plugin-ecosystem', title: 'Plugin Ecosystem Health', description: 'Policies for abandoned, compromised, deprecated and removed plugins, revoking releases, and guidance for maintainers.' },
  { src: 'docs/compatibility.md', slug: 'ref/compatibility-matrix', title: 'Compatibility Matrix', description: 'What works with what across the 1.0 release train: API levels, plugin and observer APIs, state schemas and deprecations.' },
  { src: 'docs/threat-model.md', slug: 'ref/threat-model', title: 'Threat Model', description: 'What Hive protects, from whom, where its trust boundaries are, and what it does not try to do.' },
  { src: 'SECURITY.md', slug: 'ref/security', title: 'Security Policy', description: 'How to report a vulnerability, which versions get fixes, and how Hive protects you.' },
  { src: 'docs/security-review.md', slug: 'ref/security-review', title: 'Security Review: v1.0.10', description: 'The release-quality security review of the 1.0 train: what was checked, found, fixed and left open.' },
  { src: 'docs/upgrading.md', slug: 'help/upgrading', title: 'Upgrading and Recovery', description: 'Upgrade Hive on every install path, understand failed upgrades, roll back, and recover damaged state.' },
  { src: 'docs/operations.md', slug: 'help/operations', title: 'Operating Hive', description: 'Backups, logs and retention, diagnosing failed sessions, remote runtimes, and feature maturity.' },
  { src: 'GOVERNANCE.md', slug: 'community/governance', title: 'Governance', description: 'Roles, decisions, breaking changes, releases, support and deprecation in the Hive project.' },
  { src: 'CONTRIBUTING.md', slug: 'community/contributing', title: 'Contributing', description: 'Build, test and lint Hive, and the conventions its code follows.' },
  { src: 'rfcs/README.md', slug: 'community/rfcs', title: 'RFCs', description: 'How substantial changes to Hive are proposed, discussed and decided.' },
  { src: 'rfcs/0001-after-1.0.10.md', slug: 'community/rfc-0001', title: 'RFC 0001: The Roadmap After 1.0.10', description: 'The proposed roadmap after the 1.0 train, open for comment.' },
];

// Hand-written pages whose sources other docs link to.
const CURATED = {
  'docs/observers.md': 'use/observers',
  'docs/web.md': 'use/web-observer',
  'docs/mobile.md': 'use/mobile',
  'docs/platforms.md': 'getting-started/platforms',
  'docs/plugins/api.md': 'config/plugin-api',
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

// convert rewrites links outside code, and drops the H1 (Starlight titles the
// page from its frontmatter).
function convert(src, text) {
  const out = [];
  let fence = false;
  let droppedTitle = false;
  for (const line of text.split('\n')) {
    if (/^\s*(```|~~~)/.test(line)) fence = !fence;
    if (!fence && !droppedTitle && /^# /.test(line)) {
      droppedTitle = true;
      continue;
    }
    if (fence) {
      out.push(line);
      continue;
    }
    // Leave inline code alone: split on backtick spans.
    out.push(
      line
        .split(/(`[^`]*`)/)
        .map((part) => (part.startsWith('`') ? part : part.replace(/\]\(([^)\s]+)\)/g, (_, t) => `](${rewriteLink(src, t)})`)))
        .join(''),
    );
  }
  return out.join('\n').replace(/^\n+/, '');
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
    `<!-- Generated from ${p.src} in admirable-oss/hive by .github/scripts/sync-hive-docs.mjs. Edit it there. -->`,
    '',
    convert(p.src, text),
  ].join('\n');
  const file = join(site, 'src/content/docs/docs', `${p.slug}.md`);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, page.endsWith('\n') ? page : `${page}\n`);
  written++;
}

// The roadmap page reads ROADMAP.md from GitHub; this is its offline snapshot.
writeFileSync(join(site, 'src/data/ROADMAP.md'), readFileSync(join(hive, 'ROADMAP.md')));
// Plugin release revocations, served beside the catalog.
writeFileSync(join(site, 'public/plugins/revocations.json'), readFileSync(join(hive, 'registry/revocations.json')));

console.log(`synced ${written} pages, the roadmap snapshot and plugin revocations from ${hive}`);
