import { Buffer } from 'node:buffer';

type GlobalWithAtob = typeof globalThis & { atob?: (data: string) => string };

function decodeBase64Url(input: string): string {
  const normalized = input.replace(/-/g, '+').replace(/_/g, '/');
  const padLength = (4 - (normalized.length % 4)) % 4;
  const padded = normalized + '='.repeat(padLength);
  const globalAtob = (globalThis as GlobalWithAtob).atob;

  if (typeof globalAtob === 'function') {
    return globalAtob(padded);
  }

  return Buffer.from(padded, 'base64').toString('utf-8');
}

export function decodeJwtPayload(token: string): Record<string, unknown> | null {
  const parts = token.split('.');
  if (parts.length < 2) {
    return null;
  }

  try {
    const decoded = decodeBase64Url(parts[1]);
    return JSON.parse(decoded) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function extractPermissionsFromAccessToken(token: string): string[] {
  const payload = decodeJwtPayload(token);
  if (!payload) {
    return [];
  }

  const permissions = payload.permissions;
  if (Array.isArray(permissions)) {
    return permissions.filter((value): value is string => typeof value === 'string');
  }

  if (typeof permissions === 'string') {
    return [permissions];
  }

  return [];
}

/**
 * Check if the given permissions include admin permission
 */
export function isAdminFromPermissions(permissions: string[]): boolean {
  return permissions.includes('admin');
}

