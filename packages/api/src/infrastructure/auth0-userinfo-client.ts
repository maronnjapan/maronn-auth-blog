interface ManagementTokenResponse {
  access_token: string;
  expires_in: number;
}

interface Auth0UserProfile {
  email?: string;
}

export class Auth0UserInfoClient {
  private cachedToken: { token: string; expiresAt: number } | null = null;

  constructor(
    private domain: string,
    private clientId: string,
    private clientSecret: string
  ) {}

  async getEmailByAuth0UserId(auth0UserId: string): Promise<string | null> {
    const accessToken = await this.getManagementToken();
    const response = await fetch(
      `https://${this.domain}/api/v2/users/${encodeURIComponent(auth0UserId)}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error(
        `[Auth0UserInfoClient] Failed to fetch user info for ${auth0UserId}: ${response.status} ${error}`
      );
      return null;
    }

    const data = (await response.json()) as Auth0UserProfile;
    return data.email ?? null;
  }

  private async getManagementToken(): Promise<string> {
    if (this.cachedToken && Date.now() < this.cachedToken.expiresAt - 60_000) {
      return this.cachedToken.token;
    }

    const response = await fetch(`https://${this.domain}/oauth/token`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        audience: `https://${this.domain}/api/v2/`,
        grant_type: 'client_credentials',
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to obtain Auth0 management token: ${error}`);
    }

    const data = (await response.json()) as ManagementTokenResponse;
    this.cachedToken = {
      token: data.access_token,
      expiresAt: Date.now() + data.expires_in * 1000,
    };

    return data.access_token;
  }
}
