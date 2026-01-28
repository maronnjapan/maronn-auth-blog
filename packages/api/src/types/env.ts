export interface Env {
  // Environment
  ENVIRONMENT: 'development' | 'production';

  // Auth0
  AUTH0_DOMAIN: string;
  AUTH0_CLIENT_ID: string;
  AUTH0_CLIENT_SECRET: string;
  AUTH0_CALLBACK_URL: string;

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

  // SendGrid
  SENDGRID_API_KEY: string;
  SENDGRID_FROM_EMAIL: string;

  // Cloudflare Bindings
  DB: D1Database;
  KV: KVNamespace;
  R2: R2Bucket;
}
