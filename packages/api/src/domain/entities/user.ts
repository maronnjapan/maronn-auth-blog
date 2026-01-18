import type { UserRole } from '@maronn-auth-blog/shared';

export interface UserProps {
  id: string;
  username: string;
  displayName: string;
  iconUrl?: string;
  bio?: string;
  githubUserId: string;
  githubInstallationId?: string;
  role: UserRole;
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

  get githubInstallationId(): string | undefined {
    return this.props.githubInstallationId;
  }

  get role(): UserRole {
    return this.props.role;
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

  isAdmin(): boolean {
    return this.props.role === 'admin';
  }

  updateProfile(updates: {
    displayName?: string;
    iconUrl?: string;
    bio?: string;
    githubUrl?: string;
    twitterUrl?: string;
    websiteUrl?: string;
  }): void {
    this.props = {
      ...this.props,
      ...updates,
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
      githubInstallationId: this.props.githubInstallationId,
      role: this.props.role,
      githubUrl: this.props.githubUrl,
      twitterUrl: this.props.twitterUrl,
      websiteUrl: this.props.websiteUrl,
      createdAt: this.props.createdAt.toISOString(),
      updatedAt: this.props.updatedAt.toISOString(),
    };
  }
}
