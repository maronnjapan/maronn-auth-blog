import { describe, it, expect } from 'vitest';
import {
  normalizeSearchTerm,
  tokenizeAndNormalizeQuery,
  buildFtsAndQuery,
  buildFtsOrQuery,
  processSearchQuery,
} from './search-normalizer';

describe('search-normalizer', () => {
  describe('normalizeSearchTerm', () => {
    it('should normalize OAuth variations to oauth', () => {
      expect(normalizeSearchTerm('OAuth')).toBe('oauth');
      expect(normalizeSearchTerm('OAUTH')).toBe('oauth');
      expect(normalizeSearchTerm('oauth2')).toBe('oauth');
      expect(normalizeSearchTerm('OAuth2.0')).toBe('oauth');
    });

    it('should normalize OpenID Connect variations', () => {
      expect(normalizeSearchTerm('OpenID')).toBe('openid');
      expect(normalizeSearchTerm('OIDC')).toBe('openid');
      expect(normalizeSearchTerm('openid connect')).toBe('openid');
    });

    it('should normalize JWT variations', () => {
      expect(normalizeSearchTerm('JWT')).toBe('jwt');
      expect(normalizeSearchTerm('json web token')).toBe('jwt');
    });

    it('should normalize authentication terms', () => {
      expect(normalizeSearchTerm('認証')).toBe('認証');
      expect(normalizeSearchTerm('authentication')).toBe('認証');
      expect(normalizeSearchTerm('authn')).toBe('認証');
    });

    it('should normalize authorization terms', () => {
      expect(normalizeSearchTerm('認可')).toBe('認可');
      expect(normalizeSearchTerm('authorization')).toBe('認可');
      expect(normalizeSearchTerm('authz')).toBe('認可');
    });

    it('should normalize security attack terms', () => {
      expect(normalizeSearchTerm('XSS')).toBe('xss');
      expect(normalizeSearchTerm('Cross Site Scripting')).toBe('xss');
      expect(normalizeSearchTerm('CSRF')).toBe('csrf');
      expect(normalizeSearchTerm('XSRF')).toBe('csrf');
    });

    it('should normalize MFA terms', () => {
      expect(normalizeSearchTerm('MFA')).toBe('mfa');
      expect(normalizeSearchTerm('2FA')).toBe('mfa');
      expect(normalizeSearchTerm('多要素認証')).toBe('mfa');
      expect(normalizeSearchTerm('二要素認証')).toBe('mfa');
      expect(normalizeSearchTerm('TOTP')).toBe('mfa');
    });

    it('should normalize passkey/webauthn terms', () => {
      expect(normalizeSearchTerm('passkey')).toBe('passkey');
      expect(normalizeSearchTerm('パスキー')).toBe('passkey');
      expect(normalizeSearchTerm('WebAuthn')).toBe('passkey');
      expect(normalizeSearchTerm('FIDO2')).toBe('passkey');
    });

    it('should return lowercase for unknown terms', () => {
      expect(normalizeSearchTerm('UnknownTerm')).toBe('unknownterm');
      expect(normalizeSearchTerm('  hello  ')).toBe('hello');
    });
  });

  describe('tokenizeAndNormalizeQuery', () => {
    it('should split query by spaces and normalize each token', () => {
      const result = tokenizeAndNormalizeQuery('OAuth JWT');
      expect(result).toEqual(['oauth', 'jwt']);
    });

    it('should handle full-width spaces', () => {
      const result = tokenizeAndNormalizeQuery('OAuth　JWT');
      expect(result).toEqual(['oauth', 'jwt']);
    });

    it('should handle multiple spaces', () => {
      const result = tokenizeAndNormalizeQuery('OAuth   JWT   PKCE');
      expect(result).toEqual(['oauth', 'jwt', 'pkce']);
    });

    it('should normalize Japanese and English mixed query', () => {
      const result = tokenizeAndNormalizeQuery('認証 OAuth');
      expect(result).toEqual(['認証', 'oauth']);
    });

    it('should filter empty tokens', () => {
      const result = tokenizeAndNormalizeQuery('  OAuth  ');
      expect(result).toEqual(['oauth']);
    });
  });

  describe('buildFtsAndQuery', () => {
    it('should return single token as-is', () => {
      expect(buildFtsAndQuery(['oauth'])).toBe('oauth');
    });

    it('should join multiple tokens with space for AND search', () => {
      expect(buildFtsAndQuery(['oauth', 'jwt'])).toBe('oauth jwt');
    });

    it('should return empty string for empty array', () => {
      expect(buildFtsAndQuery([])).toBe('');
    });
  });

  describe('buildFtsOrQuery', () => {
    it('should return single token as-is', () => {
      expect(buildFtsOrQuery(['oauth'])).toBe('oauth');
    });

    it('should join multiple tokens with OR for OR search', () => {
      expect(buildFtsOrQuery(['oauth', 'jwt'])).toBe('oauth OR jwt');
    });

    it('should return empty string for empty array', () => {
      expect(buildFtsOrQuery([])).toBe('');
    });
  });

  describe('processSearchQuery', () => {
    it('should process single word query', () => {
      const result = processSearchQuery('OAuth');
      expect(result).toEqual({
        originalQuery: 'OAuth',
        normalizedTokens: ['oauth'],
        andQuery: 'oauth',
        orQuery: 'oauth',
        isMultiToken: false,
      });
    });

    it('should process multi-word query', () => {
      const result = processSearchQuery('OAuth2 認証');
      expect(result).toEqual({
        originalQuery: 'OAuth2 認証',
        normalizedTokens: ['oauth', '認証'],
        andQuery: 'oauth 認証',
        orQuery: 'oauth OR 認証',
        isMultiToken: true,
      });
    });

    it('should process query with synonyms', () => {
      const result = processSearchQuery('authentication authorization');
      expect(result).toEqual({
        originalQuery: 'authentication authorization',
        normalizedTokens: ['認証', '認可'],
        andQuery: '認証 認可',
        orQuery: '認証 OR 認可',
        isMultiToken: true,
      });
    });

    it('should handle security terms', () => {
      const result = processSearchQuery('XSS CSRF 対策');
      expect(result).toEqual({
        originalQuery: 'XSS CSRF 対策',
        normalizedTokens: ['xss', 'csrf', '対策'],
        andQuery: 'xss csrf 対策',
        orQuery: 'xss OR csrf OR 対策',
        isMultiToken: true,
      });
    });
  });
});
