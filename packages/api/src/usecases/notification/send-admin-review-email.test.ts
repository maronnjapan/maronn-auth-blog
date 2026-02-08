import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SendAdminReviewEmailUsecase } from './send-admin-review-email';
import type { ResendClient } from '../../infrastructure/resend-client';

describe('SendAdminReviewEmailUsecase', () => {
  let resendClient: ResendClient;
  let usecase: SendAdminReviewEmailUsecase;

  beforeEach(() => {
    vi.clearAllMocks();
    resendClient = {
      sendEmail: vi.fn().mockResolvedValue(undefined),
    } as unknown as ResendClient;
    usecase = new SendAdminReviewEmailUsecase(resendClient);
  });

  it('sends email to admin for new article submission', async () => {
    await usecase.execute({
      adminEmail: 'admin@example.com',
      type: 'new_article',
      articleTitle: 'テスト記事',
      authorUsername: 'test-user',
      webUrl: 'https://example.com',
    });

    expect(resendClient.sendEmail).toHaveBeenCalledWith({
      to: 'admin@example.com',
      subject: '[Auth Vault] 新しい記事「テスト記事」が審査待ちです',
      text: expect.stringContaining('test-user'),
      html: expect.stringContaining('テスト記事'),
    });
  });

  it('sends email to admin for updated article', async () => {
    await usecase.execute({
      adminEmail: 'admin@example.com',
      type: 'updated_article',
      articleTitle: '更新記事',
      authorUsername: 'test-user',
      webUrl: 'https://example.com',
    });

    expect(resendClient.sendEmail).toHaveBeenCalledWith({
      to: 'admin@example.com',
      subject: '[Auth Vault] 記事「更新記事」が再審査待ちです',
      text: expect.stringContaining('再審査'),
      html: expect.stringContaining('更新記事'),
    });
  });

  it('includes review page URL in email', async () => {
    await usecase.execute({
      adminEmail: 'admin@example.com',
      type: 'new_article',
      articleTitle: 'テスト記事',
      authorUsername: 'test-user',
      webUrl: 'https://example.com',
    });

    expect(resendClient.sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        text: expect.stringContaining('https://example.com/admin/reviews'),
        html: expect.stringContaining('https://example.com/admin/reviews'),
      })
    );
  });

  it('does not throw when email sending fails', async () => {
    (resendClient.sendEmail as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('Send failed')
    );

    await expect(
      usecase.execute({
        adminEmail: 'admin@example.com',
        type: 'new_article',
        articleTitle: 'テスト記事',
        authorUsername: 'test-user',
        webUrl: 'https://example.com',
      })
    ).resolves.not.toThrow();
  });
});
