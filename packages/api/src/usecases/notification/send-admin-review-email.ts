import { ResendClient } from '../../infrastructure/resend-client';

export type AdminReviewEmailType = 'new_article' | 'updated_article';

export interface SendAdminReviewEmailInput {
  adminEmail: string;
  type: AdminReviewEmailType;
  articleTitle: string;
  authorUsername: string;
  webUrl: string;
}

export class SendAdminReviewEmailUsecase {
  constructor(private resendClient: ResendClient) {}

  async execute(input: SendAdminReviewEmailInput): Promise<void> {
    const { subject, text, html } = this.buildEmailContent(input);

    try {
      await this.resendClient.sendEmail({
        to: input.adminEmail,
        subject,
        text,
        html,
      });
      console.info(
        `[SendAdminReviewEmail] Email sent to ${input.adminEmail} for ${input.type} by ${input.authorUsername}`
      );
    } catch (error) {
      console.error(
        `[SendAdminReviewEmail] Failed to send email to ${input.adminEmail}:`,
        error
      );
    }
  }

  private buildEmailContent(input: SendAdminReviewEmailInput): {
    subject: string;
    text: string;
    html: string;
  } {
    const reviewUrl = `${input.webUrl}/admin/reviews`;

    if (input.type === 'new_article') {
      return {
        subject: `[Auth Vault] 新しい記事「${input.articleTitle}」が審査待ちです`,
        text: this.buildNewArticleText(input.articleTitle, input.authorUsername, reviewUrl),
        html: this.buildNewArticleHtml(input.articleTitle, input.authorUsername, reviewUrl),
      };
    } else {
      return {
        subject: `[Auth Vault] 記事「${input.articleTitle}」が再審査待ちです`,
        text: this.buildUpdatedArticleText(input.articleTitle, input.authorUsername, reviewUrl),
        html: this.buildUpdatedArticleHtml(input.articleTitle, input.authorUsername, reviewUrl),
      };
    }
  }

  private buildNewArticleText(title: string, author: string, reviewUrl: string): string {
    return `
Auth Vault 管理者通知

${author} さんが新しい記事「${title}」を投稿しました。
審査をお願いします。

審査ページ: ${reviewUrl}

--
Auth Vault
`.trim();
  }

  private buildNewArticleHtml(title: string, author: string, reviewUrl: string): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #3b82f6; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }
    .article-info { background: #eff6ff; border-left: 4px solid #3b82f6; padding: 16px; margin: 16px 0; }
    .button { display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 16px; }
    .footer { margin-top: 20px; font-size: 12px; color: #6b7280; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>新しい記事が投稿されました</h1>
    </div>
    <div class="content">
      <p>新しい記事が審査待ちです。</p>
      <div class="article-info">
        <p><strong>記事タイトル:</strong> ${this.escapeHtml(title)}</p>
        <p><strong>投稿者:</strong> ${this.escapeHtml(author)}</p>
      </div>
      <a href="${reviewUrl}" class="button">審査ページを開く</a>
    </div>
    <div class="footer">
      <p>Auth Vault</p>
    </div>
  </div>
</body>
</html>
`.trim();
  }

  private buildUpdatedArticleText(title: string, author: string, reviewUrl: string): string {
    return `
Auth Vault 管理者通知

${author} さんの記事「${title}」が更新され、再審査待ちになりました。
審査をお願いします。

審査ページ: ${reviewUrl}

--
Auth Vault
`.trim();
  }

  private buildUpdatedArticleHtml(title: string, author: string, reviewUrl: string): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #f59e0b; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }
    .article-info { background: #fffbeb; border-left: 4px solid #f59e0b; padding: 16px; margin: 16px 0; }
    .button { display: inline-block; background: #f59e0b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 16px; }
    .footer { margin-top: 20px; font-size: 12px; color: #6b7280; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>記事が更新されました</h1>
    </div>
    <div class="content">
      <p>記事が更新され、再審査待ちになりました。</p>
      <div class="article-info">
        <p><strong>記事タイトル:</strong> ${this.escapeHtml(title)}</p>
        <p><strong>投稿者:</strong> ${this.escapeHtml(author)}</p>
      </div>
      <a href="${reviewUrl}" class="button">審査ページを開く</a>
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
