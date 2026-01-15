import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import cloudflare from '@astrojs/cloudflare';

// Using hybrid mode to enable both SSR and SSG capabilities
// By default, all pages are SSR for fresh dynamic content
// Add `export const prerender = true;` to specific pages for SSG if needed
export default defineConfig({
  integrations: [react()],
  output: 'hybrid',
  adapter: cloudflare(),
});
