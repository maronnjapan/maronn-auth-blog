/**
 * packages/web/.env を process.env に読み込む。
 *
 * astro.config.mjs と prepare-content.mjs は Astro が .env を解決する前に動くため、
 * 両者が同じ値を見られるようにここで読み込む。
 * すでに process.env にある値は上書きしない（CI では環境変数が優先される）。
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const webDir = join(dirname(fileURLToPath(import.meta.url)), '..');

export function loadWebEnv() {
  const envPath = join(webDir, '.env');
  if (!existsSync(envPath)) return;

  for (const line of readFileSync(envPath, 'utf-8').split('\n')) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (!match) continue;

    const [, key, rawValue] = match;
    if (process.env[key] !== undefined) continue;

    const value = rawValue.trim().replace(/^(['"])(.*)\1$/, '$2');
    if (value !== '') process.env[key] = value;
  }
}
