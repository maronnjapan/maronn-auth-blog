import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import cloudflare from '@astrojs/cloudflare';

// Using server mode for SSR on Cloudflare Workers
// All pages are server-rendered for dynamic content
// Add `export const prerender = true;` to specific pages for SSG if needed
export default defineConfig({
  integrations: [react()],
  output: 'server',
  adapter: cloudflare({
    mode: 'directory', // For Workers deployment with assets
  }),
});
