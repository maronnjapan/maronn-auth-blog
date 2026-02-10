import { Auth0Client } from '../../infrastructure/auth0-client';
import { KVClient, type SessionData } from '../../infrastructure/storage/kv-client';
import { UnauthorizedError } from '@maronn-auth-blog/shared';
import { extractPermissionsFromAccessToken } from '../../utils/token';

export interface RefreshSessionResult {
  newSessionId: string;
  newSessionData: SessionData;
}

export class RefreshSessionUsecase {
  constructor(
    private auth0Client: Auth0Client,
    private kvClient: KVClient
  ) {}

  async execute(sessionData: SessionData): Promise<RefreshSessionResult> {
    if (!sessionData.refreshToken) {
      throw new UnauthorizedError('No refresh token available');
    }

    const tokens = await this.auth0Client.refreshAccessToken(
      sessionData.refreshToken
    );

    const permissions = extractPermissionsFromAccessToken(tokens.access_token);

    const newSessionId = crypto.randomUUID();
    const newSessionData: SessionData = {
      userId: sessionData.userId,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      idToken: tokens.id_token,
      expiresAt: Date.now() + tokens.expires_in * 1000,
      permissions,
    };

    await this.kvClient.setSession(newSessionId, newSessionData);

    return { newSessionId, newSessionData };
  }
}
