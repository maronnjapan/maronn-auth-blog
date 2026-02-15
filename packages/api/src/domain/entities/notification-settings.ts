export interface NotificationSettingsProps {
  id: string;
  userId: string;
  emailNotifications: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class NotificationSettings {
  constructor(private props: NotificationSettingsProps) {}

  get id(): string {
    return this.props.id;
  }

  get userId(): string {
    return this.props.userId;
  }

  get emailNotifications(): boolean {
    return this.props.emailNotifications;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  updateSettings(updates: { emailNotifications?: boolean }): void {
    if (updates.emailNotifications !== undefined) {
      this.props = {
        ...this.props,
        emailNotifications: updates.emailNotifications,
        updatedAt: new Date(),
      };
    }
  }

  toJSON() {
    return {
      id: this.props.id,
      userId: this.props.userId,
      emailNotifications: this.props.emailNotifications,
      createdAt: this.props.createdAt.toISOString(),
      updatedAt: this.props.updatedAt.toISOString(),
    };
  }
}
