import { Auth0 } from 'arctic';

export interface Auth0TokenResponse {
  access_token: string;
  refresh_token?: string;
  id_token: string;
  token_type: string;
  expires_in: number;
}

export interface Auth0UserInfo {
  sub: string;
  nickname: string;
  name: string;
  picture: string;
  email?: string;
}

export class Auth0Client {
  private auth0: Auth0;

  constructor(
    private domain: string,
    private clientId: string,
    private clientSecret: string,
    private redirectUri: string
  ) {
    this.auth0 = new Auth0(domain, clientId, clientSecret, redirectUri);
  }

  createAuthorizationURL(state: string): URL {
    const scopes = ['openid', 'profile', 'email'];
    return this.auth0.createAuthorizationURL(state, scopes);
  }

  async validateAuthorizationCode(code: string): Promise<Auth0TokenResponse> {
    const tokens = await this.auth0.validateAuthorizationCode(code);

    return {
      access_token: tokens.accessToken(),
      refresh_token: tokens.refreshToken(),
      id_token: tokens.idToken(),
      token_type: 'Bearer',
      expires_in: tokens.accessTokenExpiresAt()
        ? Math.floor((tokens.accessTokenExpiresAt()!.getTime() - Date.now()) / 1000)
        : 3600,
    };
  }

  async refreshAccessToken(refreshToken: string): Promise<Auth0TokenResponse> {
    const tokens = await this.auth0.refreshAccessToken(refreshToken);

    return {
      access_token: tokens.accessToken(),
      refresh_token: tokens.refreshToken(),
      id_token: tokens.idToken(),
      token_type: 'Bearer',
      expires_in: tokens.accessTokenExpiresAt()
        ? Math.floor((tokens.accessTokenExpiresAt()!.getTime() - Date.now()) / 1000)
        : 3600,
    };
  }

  async getUserInfo(accessToken: string): Promise<Auth0UserInfo> {
    const response = await fetch(`https://${this.domain}/userinfo`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to get user info: ${error}`);
    }

    return response.json();
  }
}

