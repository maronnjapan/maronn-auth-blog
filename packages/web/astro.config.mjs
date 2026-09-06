import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import { loadWebEnv } from './scripts/load-env.mjs';

// astro.config は Astro が .env を読み込む前に評価されるため、ここで先に取り込む。
loadWebEnv();

// 記事はリポジトリ内の Markdown なので、全ページを静的生成して
// Cloudflare Workers の静的アセットとして配信する。
export default defineConfig({
  site: process.env.PUBLIC_SITE_URL || 'http://localhost:4321',
  integrations: [react()],
  output: 'static',
  build: {
    format: 'directory',
  },
});
