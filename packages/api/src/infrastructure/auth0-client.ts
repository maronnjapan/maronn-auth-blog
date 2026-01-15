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
  constructor(
    private domain: string,
    private clientId: string,
    private clientSecret: string
  ) {}

  getAuthorizeUrl(redirectUri: string, state: string): string {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.clientId,
      redirect_uri: redirectUri,
      scope: 'openid profile email',
      state,
      connection: 'github',
    });

    return `https://${this.domain}/authorize?${params.toString()}`;
  }

  async exchangeCodeForToken(
    code: string,
    redirectUri: string
  ): Promise<Auth0TokenResponse> {
    const response = await fetch(`https://${this.domain}/oauth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        client_id: this.clientId,
        client_secret: this.clientSecret,
        code,
        redirect_uri: redirectUri,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to exchange code for token: ${error}`);
    }

    return response.json();
  }

  async refreshToken(refreshToken: string): Promise<Auth0TokenResponse> {
    const response = await fetch(`https://${this.domain}/oauth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        grant_type: 'refresh_token',
        client_id: this.clientId,
        client_secret: this.clientSecret,
        refresh_token: refreshToken,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to refresh token: ${error}`);
    }

    return response.json();
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
