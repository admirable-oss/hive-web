// @ts-nocheck
import { defineConfig, envField } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';

import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';

import starlight from '@astrojs/starlight';
import vercel from '@astrojs/vercel';

const REPO = 'https://github.com/admirable-oss/hive';
const GA_MEASUREMENT_ID = 'G-579TFV1E9W';
// The Vercel server entrypoint imports routing constants from the adapter's
// main module, which also imports Rolldown's build-only middleware bundler.
// Replace the constants import in the server bundle so request-time code never
// loads Rolldown or its native bindings.
const vercelEntrypointConstantsId = '\0hive:vercel-entrypoint-constants';
const vercelEntrypointConstantsPlugin = {
  name: 'hive-vercel-entrypoint-constants',
  enforce: 'pre',
  resolveId(source, importer) {
    if (
      source === '../index.js' &&
      importer?.replaceAll('\\', '/').includes('/@astrojs/vercel/dist/serverless/entrypoint.js')
    ) {
      return vercelEntrypointConstantsId;
    }
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
  },
};
const NOINDEX_DOCS = new Set([
  '/docs/agents/',
  '/docs/api/',
  '/docs/architecture/',
  '/docs/cli/',
  '/docs/concepts/',
  '/docs/configuration/',
  '/docs/copy-mode/',
  '/docs/machines/',
  '/docs/marketplace/',
  '/docs/plugins/',
  '/docs/session-state/',
  '/docs/themes/',
]);

// https://astro.build/config
export default defineConfig({
  site: 'https://hive.admir-saheta.com',

  // Pages are static by default; on-demand ones (/roadmap) are ISR-cached for 8 hours,
  // so ROADMAP.md is re-read at most three times a day. Actions always run live.
  adapter: vercel({
    isr: { expiration: 60 * 60 * 8, exclude: [/^\/_actions\//] },
  }),

  env: {
    schema: {
      GITHUB_TOKEN: envField.string({ context: 'server', access: 'secret', optional: true }),
    },
  },

  vite: {
    plugins: [tailwindcss(), vercelEntrypointConstantsPlugin],
    ssr: {
      // Bundle GSAP plugins into the server chunks. Their package export map
      // exposes CJS files to Vercel's Node runtime, which cannot provide the
      // named ESM exports used by SplitText and ScrollTrigger imports.
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

  integrations: [react(), sitemap({
    filter: (page) => !NOINDEX_DOCS.has(new URL(page).pathname),
  }), starlight({
    title: 'Hive',
    description: 'Coding agents that never clock out!',
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
        content: `window.dataLayer = window.dataLayer || []; function gtag(){window.dataLayer.push(arguments);} window.gtag = gtag; gtag('js', new Date()); gtag('config', '${GA_MEASUREMENT_ID}');`,
      },
      {
        tag: 'script',
        attrs: { type: 'application/ld+json' },
        content: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'WebSite',
          name: 'Hive',
          url: 'https://hive.admir-saheta.com/',
          publisher: {
            '@type': 'Organization',
            name: 'Hive',
            url: 'https://hive.admir-saheta.com/',
            sameAs: [REPO],
          },
        }).replace(/</g, '\\u003c'),
      },
    ],
    customCss: ['./src/styles/docs.css'],
    social: [{ icon: 'github', label: 'GitHub', href: REPO }],
    // The docs are dark-only, like the rest of the hive (see ThemeProvider/ThemeSelect overrides).
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
    markdown: { headingLinks: false },
    tableOfContents: { minHeadingLevel: 2, maxHeadingLevel: 2 },
    credits: false,
    sidebar: [
      {
        label: 'Getting started',
        items: [
          { label: 'Introduction', link: '/docs/' },
          'docs/installation',
          'docs/quick-start',
        ],
      },
      {
        label: 'Concepts',
        items: [
          'docs/concepts',
          'docs/agents',
          { slug: 'docs/machines', badge: 'roadmap' },
          'docs/session-state',
        ],
      },
      {
        label: 'Guides',
        items: ['docs/configuration', 'docs/keybindings', 'docs/copy-mode', 'docs/themes'],
      },
      {
        label: 'Development',
        items: [
          'docs/cli',
          'docs/api',
          'docs/architecture',
          { slug: 'docs/plugins', badge: 'roadmap' },
          { slug: 'docs/marketplace', badge: 'later' },
        ],
      },
    ],
  })]
});
