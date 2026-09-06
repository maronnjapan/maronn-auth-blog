/// <reference path="../.astro/types.d.ts" />

interface ImportMetaEnv {
  /** サイトの公開 URL（フィードや OGP の絶対 URL 生成に使う） */
  readonly PUBLIC_SITE_URL?: string;
  /** zenn-markdown-html の埋め込み iframe を配信する embed Worker の URL */
  readonly PUBLIC_EMBED_ORIGIN?: string;
  /** Cloudflare Web Analytics のトークン。未設定ならタグを出力しない */
  readonly PUBLIC_CF_WEB_ANALYTICS_TOKEN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
