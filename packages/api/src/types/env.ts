export interface Env {
  // Environment
  ENVIRONMENT: 'development' | 'production';

  // Auth0
  AUTH0_DOMAIN: string;
  AUTH0_CLIENT_ID: string;
  AUTH0_CLIENT_SECRET: string;
  AUTH0_CALLBACK_URL: string;

  // Auth0 Machine-to-Machine (Management API)
  AUTH0_M2M_CLIENT_ID: string;
  AUTH0_M2M_CLIENT_SECRET: string;

  // GitHub App
  GITHUB_APP_ID: string;
  GITHUB_APP_PRIVATE_KEY: string;
  GITHUB_WEBHOOK_SECRET: string;

  // Session
  SESSION_SECRET: string;

  // URLs
  API_URL: string;
  WEB_URL: string;
  EMBED_ORIGIN: string;
  IMAGE_URL: string;

  // Cookie domain for cross-subdomain sharing (e.g., '.maronn-room.com')
  COOKIE_DOMAIN?: string;

  // Resend
  RESEND_API_KEY: string;
  NOTIFICATION_EMAIL_FROM: string;
  ADMIN_NOTIFICATION_EMAIL: string;

  // Cloudflare Analytics
  CF_API_TOKEN: string;
  CF_ZONE_ID: string;

  // Cloudflare Bindings
  DB: D1Database;
  KV: KVNamespace;
  R2: R2Bucket;
}
