// @ts-check
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';

import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';

import starlight from '@astrojs/starlight';

const REPO = 'https://github.com/admirable-oss/hive';

// https://astro.build/config
export default defineConfig({
  site: 'https://hive.admir-saheta.com',

  vite: {
    plugins: [tailwindcss()]
  },

  integrations: [react(), sitemap(), starlight({
    title: 'Hive',
    description: 'Coding agents that never clock out!',
    favicon: '/favicon.svg',
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
