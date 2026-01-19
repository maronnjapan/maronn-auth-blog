import { Buffer } from 'node:buffer';
import { describe, it, expect } from 'vitest';
import { decodeJwtPayload, extractPermissionsFromAccessToken } from './token';

function createToken(payload: Record<string, unknown>): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payloadPart = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${header}.${payloadPart}.signature`;
}

describe('token utilities', () => {
  it('decodes JWT payloads when provided a valid token', () => {
    const token = createToken({ permissions: ['admin:users'] });
    const payload = decodeJwtPayload(token);
    expect(payload).toMatchObject({ permissions: ['admin:users'] });
  });

  it('returns an empty array when permissions claim is missing', () => {
    const token = createToken({ sub: 'user-1' });
    expect(extractPermissionsFromAccessToken(token)).toEqual([]);
  });

  it('normalizes single permission strings into arrays', () => {
    const token = createToken({ permissions: 'admin:users' });
    expect(extractPermissionsFromAccessToken(token)).toEqual(['admin:users']);
  });

  it('filters out non-string permission values', () => {
    const token = createToken({ permissions: ['admin:users', 123] });
    expect(extractPermissionsFromAccessToken(token)).toEqual(['admin:users']);
  });
});

