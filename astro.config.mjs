import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import sitemap from '@astrojs/sitemap';
import vercel from '@astrojs/vercel';

const siteUrl = process.env.SITE_URL || 'https://portal.omontadordemoveis.com';

export default defineConfig({
  output: 'server',
  integrations: [tailwind(), sitemap()],
  adapter: vercel(),
  base: '/',
  site: siteUrl,
});