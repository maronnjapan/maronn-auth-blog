import { FollowRepository } from '../../infrastructure/repositories/follow-repository';
import { NotificationRepository } from '../../infrastructure/repositories/notification-repository';
import { NotificationSettingsRepository } from '../../infrastructure/repositories/notification-settings-repository';
import { UserRepository } from '../../infrastructure/repositories/user-repository';
import { Auth0UserInfoClient } from '../../infrastructure/auth0-userinfo-client';
import { ResendClient } from '../../infrastructure/resend-client';
import { CreateNotificationUsecase } from './create-notification';

export interface NotifyFollowersInput {
  authorId: string;
  articleId: string;
  articleTitle: string;
  articleSlug: string;
  authorUsername: string;
  authorDisplayName: string;
  webUrl: string;
}

export class NotifyFollowersUsecase {
  constructor(
    private followRepo: FollowRepository,
    private notificationRepo: NotificationRepository,
    private notificationSettingsRepo: NotificationSettingsRepository,
    private userRepo: UserRepository,
    private auth0UserInfoClient: Auth0UserInfoClient,
    private resendClient: ResendClient,
  ) {}

  async execute(input: NotifyFollowersInput): Promise<void> {
    console.info(`[NotifyFollowers] Notifying followers of author: ${input.authorId}`);

    const followerIds = await this.followRepo.getFollowerIds(input.authorId);

    if (followerIds.length === 0) {
      console.info('[NotifyFollowers] No followers to notify');
      return;
    }

    console.info(`[NotifyFollowers] Found ${followerIds.length} followers to notify`);

    const createNotification = new CreateNotificationUsecase(this.notificationRepo);
    const articleUrl = `${input.webUrl}/${input.authorUsername}/articles/${input.articleSlug}`;

    for (const followerId of followerIds) {
      try {
        // Create in-app notification
        await createNotification.execute({
          userId: followerId,
          type: 'new_article_from_followed',
          articleId: input.articleId,
          message: `${input.authorDisplayName} さんが新しい記事「${input.articleTitle}」を公開しました`,
        });

        // Check if email notifications are enabled for this follower
        const settings = await this.notificationSettingsRepo.findByUserId(followerId);
        if (settings?.emailNotifications) {
          await this.sendFollowerEmail(followerId, input, articleUrl);
        }
      } catch (error) {
        console.error(`[NotifyFollowers] Failed to notify follower ${followerId}:`, error);
      }
    }

    console.info(`[NotifyFollowers] Finished notifying followers of author: ${input.authorId}`);
  }

  private async sendFollowerEmail(
    followerId: string,
    input: NotifyFollowersInput,
    articleUrl: string,
  ): Promise<void> {
    try {
      const followerUser = await this.userRepo.findById(followerId);
      if (!followerUser || !followerUser.auth0UserId) {
        return;
      }

      let email: string | null = null;
      try {
        email = await this.auth0UserInfoClient.getEmailByAuth0UserId(followerUser.auth0UserId);
      } catch (error) {
        console.error(`[NotifyFollowers] Failed to resolve email for follower ${followerId}:`, error);
        return;
      }

      if (!email) {
        return;
      }

      const subject = `[Auth Vault] ${input.authorDisplayName} さんが新しい記事を公開しました`;
      const text = `
Auth Vault をご利用いただきありがとうございます。

フォロー中の ${input.authorDisplayName} さんが新しい記事「${input.articleTitle}」を公開しました。

記事を読む: ${articleUrl}

--
Auth Vault
`.trim();

      const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #3b82f6; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }
    .button { display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 16px; }
    .footer { margin-top: 20px; font-size: 12px; color: #6b7280; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>新しい記事が公開されました</h1>
    </div>
    <div class="content">
      <p>Auth Vault をご利用いただきありがとうございます。</p>
      <p>フォロー中の <strong>${this.escapeHtml(input.authorDisplayName)}</strong> さんが新しい記事を公開しました。</p>
      <p>「<strong>${this.escapeHtml(input.articleTitle)}</strong>」</p>
      <a href="${articleUrl}" class="button">記事を読む</a>
    </div>
    <div class="footer">
      <p>Auth Vault</p>
      <p>この通知はフォロー中の著者の新着記事をお知らせしています。通知設定はダッシュボードの設定画面から変更できます。</p>
    </div>
  </div>
</body>
</html>
`.trim();

      await this.resendClient.sendEmail({ to: email, subject, text, html });
      console.info(`[NotifyFollowers] Email sent to follower ${followerId}`);
    } catch (error) {
      console.error(`[NotifyFollowers] Failed to send email to follower ${followerId}:`, error);
    }
  }

  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}
