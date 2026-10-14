import { defineConfig, envField } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import mdx from '@astrojs/mdx';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import starlight from '@astrojs/starlight';
import vercel from '@astrojs/vercel';
import { readFileSync, readdirSync } from 'node:fs';

const REPO = 'https://github.com/admirable-oss/hive';
const SITE = 'https://hive.admir-saheta.com';
const GA_MEASUREMENT_ID = 'G-579TFV1E9W';

const noindexBlogPaths = (() => {
  const paths = new Set();
  const root = new URL('./src/content/blog/', import.meta.url);
  const visit = (directory) => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const file = new URL(`${entry.name}${entry.isDirectory() ? '/' : ''}`, directory);
      if (entry.isDirectory()) visit(file);
      else if (/\.(md|mdx)$/.test(entry.name)) {
        const source = readFileSync(file, 'utf8');
        const frontmatter = source.match(/^---\s*\n([\s\S]*?)\n---/)?.[1] ?? '';
        const seo = frontmatter.match(/^seo:\s*\n((?:[ \t].*\n?)*)/m)?.[1] ?? '';
        if (/^[ \t]+noindex:\s*true\s*$/m.test(seo)) {
          const relative = file.pathname.slice(root.pathname.length).replace(/\.(md|mdx)$/, '');
          paths.add(`/blog/${relative}`);
        }
      }
    }
  };
  try { visit(root); } catch { /* Blog content may not exist in an early checkout. */ }
  return paths;
})();

const pluginPages = (() => {
  try {
    const raw = readFileSync(new URL('./src/data/plugins-registry.json', import.meta.url), 'utf-8');
    const data = JSON.parse(raw);
    return (data.plugins || []).map((p) => `${SITE}/plugins/${p.id}/`);
  } catch {
    return [];
  }
})();

// Avoid loading Rolldown's build-only middleware bundler at request time.
// The Vercel server entrypoint imports these constants from the adapter.
const vercelEntrypointConstantsId = '\0hive:vercel-entrypoint-constants';

const vercelEntrypointConstantsPlugin = {
  name: 'hive-vercel-entrypoint-constants',
  enforce: 'pre',

  resolveId(source, importer) {
    if (
      source === '../index.js' &&
      importer
        ?.replaceAll('\\', '/')
        .includes('/@astrojs/vercel/dist/serverless/entrypoint.js')
    ) {
      return vercelEntrypointConstantsId;
    }

    return undefined;
  },

  load(id) {
    if (id === vercelEntrypointConstantsId) {
      return `
        export const ASTRO_LOCALS_HEADER = 'x-astro-locals';
        export const ASTRO_MIDDLEWARE_SECRET_HEADER = 'x-astro-middleware-secret';
        export const ASTRO_PATH_HEADER = 'x-astro-path';
        export const ASTRO_PATH_PARAM = 'x_astro_path';
        export const ASTRO_PATH_TOKEN_PARAM = 'x_astro_path_token';
      `;
    }

    return undefined;
  },
};

const docLink = (label, path) => ({
  label,
  link: `/docs/${path}`,
});

// https://astro.build/config
export default defineConfig({
  site: SITE,

  // Static pages by default. ISR pages expire after eight hours.
  // Actions remain live, and the roadmap is refreshed on revalidation.
  adapter: vercel({
    isr: {
      expiration: 60 * 60 * 8,
      exclude: [/^\/_actions\//],
    },
  }),

  env: {
    schema: {
      GITHUB_TOKEN: envField.string({
        context: 'server',
        access: 'secret',
        optional: true,
      }),
      HIVE_PLUGIN_REGISTRY_URL: envField.string({
        context: 'server',
        access: 'secret',
        optional: true,
      }),
    },
  },

  vite: {
    plugins: [tailwindcss(), vercelEntrypointConstantsPlugin],

    ssr: {
      // Bundle GSAP plugins into server chunks for Vercel's Node runtime.
      noExternal: ['gsap', '@gsap/react'],
    },

    build: {
      rolldownOptions: {
        output: {
          codeSplitting: {
            groups: [
              {
                name: 'three-core',
                test: /node_modules[\\/]three[\\/]/,
                priority: 10,
                maxSize: 350_000,
              },
              {
                name: 'three-fiber',
                test: /node_modules[\\/]@react-three[\\/]fiber[\\/]/,
                priority: 10,
              },
              {
                name: 'three-drei',
                test: /node_modules[\\/]@react-three[\\/]drei[\\/]/,
                priority: 10,
              },
            ],
          },
        },
      },
    },
  },

  integrations: [
    react(),

    sitemap({
      customPages: pluginPages,
      filter(page) {
        const pathname = new URL(page).pathname.replace(/\/+$/, '');
        return !noindexBlogPaths.has(pathname) && !pathname.split('/').includes('sort');
      },
      serialize(item) {
        item.lastmod = new Date();
        const url = item.url.replace(/\/$/, '');
        if (url === SITE) {
          item.priority = 1.0;
          item.changefreq = 'daily';
        } else if (url.includes('/plugins')) {
          item.priority = 0.9;
          item.changefreq = 'daily';
        } else if (url.includes('/pricing') || url.includes('/roadmap')) {
          item.priority = 0.8;
          item.changefreq = 'daily';
        } else if (url.includes('/docs')) {
          item.priority = 0.7;
          item.changefreq = 'weekly';
        } else {
          item.priority = 0.5;
          item.changefreq = 'monthly';
        }
        return item;
      },
    }),

    starlight({
      title: 'Hive',
      description: 'Coding agents that never clock out.',
      disable404Route: true,
      favicon: '/favicon.svg',

      head: [
        {
          tag: 'script',
          attrs: {
            src: `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`,
            async: true,
          },
        },
        {
          tag: 'script',
          content: `
            window.dataLayer = window.dataLayer || [];
            function gtag() {
              window.dataLayer.push(arguments);
            }
            window.gtag = gtag;
            gtag('js', new Date());
            gtag('config', '${GA_MEASUREMENT_ID}');
          `,
        },
        {
          tag: 'script',
          attrs: {
            type: 'application/ld+json',
          },
          content: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'WebSite',
            name: 'Hive',
            url: `${SITE}/`,
            publisher: {
              '@type': 'Organization',
              name: 'Hive',
              url: `${SITE}/`,
              sameAs: [REPO],
            },
          }).replace(/</g, '\\u003c'),
        },
      ],

      customCss: ['./src/styles/docs.css'],

      social: [
        {
          icon: 'github',
          label: 'GitHub',
          href: REPO,
        },
      ],

      // Dark-only documentation theme.
      components: {
        ThemeProvider: './src/components/docs/ThemeProvider.astro',
        ThemeSelect: './src/components/docs/ThemeSelect.astro',
        PageFrame: './src/components/docs/PageFrame.astro',
        Header: './src/components/docs/Header.astro',
        SiteTitle: './src/components/docs/SiteTitle.astro',
        MobileMenuToggle: './src/components/docs/MobileMenuToggle.astro',
        MobileMenuFooter: './src/components/docs/MobileMenuFooter.astro',
        Sidebar: './src/components/docs/Sidebar.astro',
        PageTitle: './src/components/docs/PageTitle.astro',
        TableOfContents: './src/components/docs/TableOfContents.astro',
        Hero: './src/components/docs/Hero.astro',
        Pagination: './src/components/docs/Pagination.astro',
        Footer: './src/components/docs/Footer.astro',
      },

      markdown: {
        headingLinks: false,
      },

      tableOfContents: {
        minHeadingLevel: 2,
        maxHeadingLevel: 2,
      },

      credits: false,

      sidebar: [
        {
          label: 'Getting started',
          items: [
            docLink('Installation', 'getting-started/installation'),
            docLink('Quick Start', 'getting-started/quick-start'),
            docLink('Core Concepts', 'getting-started/core-concepts'),
            docLink('Keystrokes', 'getting-started/keystrokes'),
            docLink('Migrating from herdr', 'getting-started/migrating-from-herdr'),
          ],
        },

        {
          label: 'Daily Hive (Bee)nefits',
          items: [
            docLink('How to Benefit From Hive', 'use/how-it-works'),
            docLink('Bees (Agents)', 'use/ai-agents'),
            docLink('Orchestration', 'use/ai-orchestration'),
            docLink('Sessions', 'use/sessions-and-co'),
            docLink('Persistence', 'use/persistence'),
            docLink('Hive RC — Remote Control', 'use/rc-ra'),
            docLink('Neural Networks', 'use/neural-networks'),
          ],
        },

        {
          label: 'Configuration',
          items: [
            docLink('Configuration', 'config/configuration'),
            docLink('Configuration Reference', 'config/config-reference'),
            docLink('Plugins', 'config/plugins'),
            docLink('App Store', 'config/app-store'),
          ],
        },

        {
          label: 'Reference',
          items: [
            docLink('CLI Reference', 'ref/cli-reference'),
            docLink('Socket API', 'ref/socket-api'),
            docLink('API Reference', 'ref/api-reference'),
            docLink('Compatibility', 'ref/compatibility'),
            docLink('Integrations', 'ref/integrations'),
            docLink('Agent Skill', 'ref/agent-skill'),
          ],
        },

        {
          label: 'Architecture',
          items: [docLink('Architecture Decisions', 'ref/architecture')],
        },

        {
          label: 'Hive Optimize',
          items: [
            docLink('Custom Agent Support', 'optimize/custom-agent-hive-support'),
          ],
        },

        {
          label: 'Help',
          items: [
            docLink('Troubleshooting', 'help/troubleshoot'),
          ],
        },
      ],
    }),
    mdx({ optimize: true }),
  ],
});
