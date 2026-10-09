// @ts-check
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';

import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';

import starlight from '@astrojs/starlight';

// https://astro.build/config
export default defineConfig({
  site: 'https://hive.admir-saheta.com',

  vite: {
    plugins: [tailwindcss()]
  },

  integrations: [react(), sitemap(), starlight({
    title: 'Hive',
    description: 'Coding agents that never clock out!',
    customCss: [
      './src/styles/global.css'
    ],
  })]
});