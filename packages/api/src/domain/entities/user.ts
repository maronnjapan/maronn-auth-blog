export interface UserProps {
  id: string;
  username: string;
  displayName: string;
  iconUrl?: string;
  bio?: string;
  githubUserId: string;
  auth0UserId?: string;
  githubInstallationId?: string;
  githubUrl?: string;
  twitterUrl?: string;
  websiteUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

export class User {
  constructor(private props: UserProps) {}

  get id(): string {
    return this.props.id;
  }

  get username(): string {
    return this.props.username;
  }

  get displayName(): string {
    return this.props.displayName;
  }

  get iconUrl(): string | undefined {
    return this.props.iconUrl;
  }

  get bio(): string | undefined {
    return this.props.bio;
  }

  get githubUserId(): string {
    return this.props.githubUserId;
  }

  get auth0UserId(): string | undefined {
    return this.props.auth0UserId;
  }

  get githubInstallationId(): string | undefined {
    return this.props.githubInstallationId;
  }

  get githubUrl(): string | undefined {
    return this.props.githubUrl;
  }

  get twitterUrl(): string | undefined {
    return this.props.twitterUrl;
  }

  get websiteUrl(): string | undefined {
    return this.props.websiteUrl;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  updateProfile(updates: {
    username?: string;
    displayName?: string;
    iconUrl?: string;
    bio?: string;
    githubUrl?: string;
    twitterUrl?: string;
    websiteUrl?: string;
  }): void {
    const normalizedUpdates = {
      ...updates,
      githubUrl: this.normalizeOptionalUrl(updates.githubUrl),
      twitterUrl: this.normalizeOptionalUrl(updates.twitterUrl),
      websiteUrl: this.normalizeOptionalUrl(updates.websiteUrl),
    };

    this.props = {
      ...this.props,
      ...normalizedUpdates,
      updatedAt: new Date(),
    };
  }

  private normalizeOptionalUrl(value?: string): string | undefined {
    if (value === undefined) {
      return undefined;
    }

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }

  setAuth0UserId(auth0UserId: string): void {
    this.props = {
      ...this.props,
      auth0UserId,
      updatedAt: new Date(),
    };
  }

  setGitHubInstallation(installationId: string): void {
    this.props = {
      ...this.props,
      githubInstallationId: installationId,
      updatedAt: new Date(),
    };
  }

  toJSON() {
    return {
      id: this.props.id,
      username: this.props.username,
      displayName: this.props.displayName,
      iconUrl: this.props.iconUrl,
      bio: this.props.bio,
      githubUserId: this.props.githubUserId,
      auth0UserId: this.props.auth0UserId,
      githubInstallationId: this.props.githubInstallationId,
      githubUrl: this.props.githubUrl,
      twitterUrl: this.props.twitterUrl,
      websiteUrl: this.props.websiteUrl,
      createdAt: this.props.createdAt.toISOString(),
      updatedAt: this.props.updatedAt.toISOString(),
    };
  }
}
