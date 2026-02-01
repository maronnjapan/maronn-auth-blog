import { Auth0UserInfoClient } from '../../infrastructure/auth0-userinfo-client';
import { ResendClient } from '../../infrastructure/resend-client';

export type EmailNotificationType = 'article_approved' | 'article_rejected';

export interface SendEmailNotificationInput {
  userId: string;
  auth0UserId: string;
  type: EmailNotificationType;
  articleTitle: string;
  articleSlug: string;
  username: string;
  rejectionReason?: string;
  webUrl: string;
}

export class SendEmailNotificationUsecase {
  constructor(
    private userInfoClient: Auth0UserInfoClient,
    private resendClient: ResendClient
  ) {}

  async execute(input: SendEmailNotificationInput): Promise<void> {
    let email: string | null = null;
    try {
      email = await this.userInfoClient.getEmailByAuth0UserId(input.auth0UserId);
    } catch (error) {
      console.error(
        `[SendEmailNotification] Failed to resolve email for user ${input.userId} (Auth0: ${input.auth0UserId})`,
        error
      );
      return;
    }

    if (!email) {
      console.warn(
        `[SendEmailNotification] User ${input.userId} (Auth0: ${input.auth0UserId}) has no email address, skipping email notification`
      );
      return;
    }

    const { subject, text, html } = this.buildEmailContent(input);

    try {
      await this.resendClient.sendEmail({
        to: email,
        subject,
        text,
        html,
      });
      console.info(`[SendEmailNotification] Email sent to ${email} for ${input.type}`);
    } catch (error) {
      // Log the error but don't throw - email notification failure shouldn't block the main flow
      console.error(`[SendEmailNotification] Failed to send email to ${email}:`, error);
    }
  }

  private buildEmailContent(input: SendEmailNotificationInput): {
    subject: string;
    text: string;
    html: string;
  } {
    const articleUrl = `${input.webUrl}/${input.username}/articles/${input.articleSlug}`;

    if (input.type === 'article_approved') {
      return {
        subject: `[Auth Vault] 記事「${input.articleTitle}」が承認されました`,
        text: this.buildApprovalText(input.articleTitle, articleUrl),
        html: this.buildApprovalHtml(input.articleTitle, articleUrl),
      };
    } else {
      return {
        subject: `[Auth Vault] 記事「${input.articleTitle}」が却下されました`,
        text: this.buildRejectionText(input.articleTitle, input.rejectionReason || ''),
        html: this.buildRejectionHtml(input.articleTitle, input.rejectionReason || ''),
      };
    }
  }

  private buildApprovalText(title: string, articleUrl: string): string {
    return `
Auth Vault をご利用いただきありがとうございます。

あなたの記事「${title}」が承認され、公開されました。

記事を確認する: ${articleUrl}

--
Auth Vault
`.trim();
  }

  private buildApprovalHtml(title: string, articleUrl: string): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #10b981; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }
    .button { display: inline-block; background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 16px; }
    .footer { margin-top: 20px; font-size: 12px; color: #6b7280; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>記事が承認されました</h1>
    </div>
    <div class="content">
      <p>Auth Vault をご利用いただきありがとうございます。</p>
      <p>あなたの記事「<strong>${this.escapeHtml(title)}</strong>」が承認され、公開されました。</p>
      <a href="${articleUrl}" class="button">記事を確認する</a>
    </div>
    <div class="footer">
      <p>Auth Vault</p>
    </div>
  </div>
</body>
</html>
`.trim();
  }

  private buildRejectionText(title: string, reason: string): string {
    return `
Auth Vault をご利用いただきありがとうございます。

あなたの記事「${title}」は審査の結果、却下されました。

却下理由:
${reason}

内容を修正して再度申請してください。

--
Auth Vault
`.trim();
  }

  private buildRejectionHtml(title: string, reason: string): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #ef4444; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }
    .reason { background: #fee2e2; border-left: 4px solid #ef4444; padding: 16px; margin: 16px 0; }
    .footer { margin-top: 20px; font-size: 12px; color: #6b7280; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>記事が却下されました</h1>
    </div>
    <div class="content">
      <p>Auth Vault をご利用いただきありがとうございます。</p>
      <p>あなたの記事「<strong>${this.escapeHtml(title)}</strong>」は審査の結果、却下されました。</p>
      <div class="reason">
        <strong>却下理由:</strong>
        <p>${this.escapeHtml(reason)}</p>
      </div>
      <p>内容を修正して再度申請してください。</p>
    </div>
    <div class="footer">
      <p>Auth Vault</p>
    </div>
  </div>
</body>
</html>
`.trim();
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
