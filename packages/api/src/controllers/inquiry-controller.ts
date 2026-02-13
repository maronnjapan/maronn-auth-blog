import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import type { Env } from '../types/env';
import { InquiryRepository } from '../infrastructure/repositories/inquiry-repository';
import { ResendClient } from '../infrastructure/resend-client';
import { requireAdmin } from '../middleware/auth';
import { NotFoundError } from '@maronn-auth-blog/shared';

const app = new Hono<{ Bindings: Env }>();

// POST /inquiries - Submit a new inquiry (public, no auth required)
app.post(
  '/',
  zValidator('json', z.object({
    name: z.string().min(1).max(100),
    email: z.string().email().max(254),
    company: z.string().max(200).optional(),
    inquiryType: z.enum(['consulting', 'development', 'training', 'other']),
    subject: z.string().min(1).max(200),
    message: z.string().min(10).max(5000),
  })),
  async (c) => {
    const body = c.req.valid('json');

    const inquiryRepo = new InquiryRepository(c.env.DB);
    const inquiry = await inquiryRepo.create(body);

    // Send notification email to admin (non-blocking)
    c.executionCtx.waitUntil(
      (async () => {
        try {
          if (!c.env.RESEND_API_KEY || !c.env.ADMIN_NOTIFICATION_EMAIL) {
            console.warn('[Inquiry] Missing email config, skipping notification');
            return;
          }

          const inquiryTypeLabels: Record<string, string> = {
            consulting: 'コンサルティング',
            development: '開発案件',
            training: 'トレーニング・研修',
            other: 'その他',
          };

          const resendClient = new ResendClient(
            c.env.RESEND_API_KEY,
            c.env.NOTIFICATION_EMAIL_FROM
          );

          await resendClient.sendEmail({
            to: c.env.ADMIN_NOTIFICATION_EMAIL,
            subject: `[Auth Vault] 新しいお問い合わせ: ${body.subject}`,
            text: [
              `新しいお問い合わせを受信しました。`,
              ``,
              `■ お問い合わせ種別: ${inquiryTypeLabels[body.inquiryType] || body.inquiryType}`,
              `■ お名前: ${body.name}`,
              `■ メールアドレス: ${body.email}`,
              body.company ? `■ 会社名: ${body.company}` : '',
              `■ 件名: ${body.subject}`,
              ``,
              `■ メッセージ:`,
              body.message,
              ``,
              `---`,
              `Auth Vault お問い合わせシステム`,
            ].filter(Boolean).join('\n'),
            html: `
              <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #333; border-bottom: 2px solid #6366f1; padding-bottom: 0.5rem;">
                  新しいお問い合わせ
                </h2>
                <table style="width: 100%; border-collapse: collapse; margin: 1rem 0;">
                  <tr>
                    <td style="padding: 0.5rem; font-weight: bold; color: #555; width: 140px;">種別</td>
                    <td style="padding: 0.5rem;">${inquiryTypeLabels[body.inquiryType] || body.inquiryType}</td>
                  </tr>
                  <tr style="background: #f9f9f9;">
                    <td style="padding: 0.5rem; font-weight: bold; color: #555;">お名前</td>
                    <td style="padding: 0.5rem;">${escapeHtml(body.name)}</td>
                  </tr>
                  <tr>
                    <td style="padding: 0.5rem; font-weight: bold; color: #555;">メール</td>
                    <td style="padding: 0.5rem;"><a href="mailto:${escapeHtml(body.email)}">${escapeHtml(body.email)}</a></td>
                  </tr>
                  ${body.company ? `
                  <tr style="background: #f9f9f9;">
                    <td style="padding: 0.5rem; font-weight: bold; color: #555;">会社名</td>
                    <td style="padding: 0.5rem;">${escapeHtml(body.company)}</td>
                  </tr>` : ''}
                  <tr>
                    <td style="padding: 0.5rem; font-weight: bold; color: #555;">件名</td>
                    <td style="padding: 0.5rem;">${escapeHtml(body.subject)}</td>
                  </tr>
                </table>
                <div style="background: #f5f5f5; padding: 1rem; border-radius: 8px; margin: 1rem 0;">
                  <p style="margin: 0; white-space: pre-wrap; line-height: 1.6;">${escapeHtml(body.message)}</p>
                </div>
                <p style="color: #888; font-size: 0.85rem; margin-top: 2rem;">
                  Auth Vault お問い合わせシステム
                </p>
              </div>
            `,
          });
        } catch (err) {
          console.error('[Inquiry] Failed to send notification email:', err);
        }
      })()
    );

    return c.json({ success: true, id: inquiry.id }, 201);
  }
);

// GET /inquiries - Get all inquiries (admin only)
app.get('/', requireAdmin(), async (c) => {
  const page = parseInt(c.req.query('page') || '1');
  const limit = parseInt(c.req.query('limit') || '20');
  const offset = (page - 1) * limit;

  const inquiryRepo = new InquiryRepository(c.env.DB);
  const [inquiries, total, newCount] = await Promise.all([
    inquiryRepo.findAll(limit, offset),
    inquiryRepo.countAll(),
    inquiryRepo.countByStatus('new'),
  ]);

  return c.json({
    inquiries,
    total,
    newCount,
    page,
    limit,
    hasMore: offset + inquiries.length < total,
  });
});

// GET /inquiries/:id - Get inquiry detail (admin only)
app.get('/:id', requireAdmin(), async (c) => {
  const id = c.req.param('id');
  const inquiryRepo = new InquiryRepository(c.env.DB);
  const inquiry = await inquiryRepo.findById(id);

  if (!inquiry) {
    throw new NotFoundError('Inquiry', id);
  }

  return c.json(inquiry);
});

// PUT /inquiries/:id/status - Update inquiry status (admin only)
app.put(
  '/:id/status',
  requireAdmin(),
  zValidator('json', z.object({
    status: z.enum(['new', 'read', 'replied', 'closed']),
  })),
  async (c) => {
    const id = c.req.param('id');
    const { status } = c.req.valid('json');

    const inquiryRepo = new InquiryRepository(c.env.DB);
    const inquiry = await inquiryRepo.findById(id);
    if (!inquiry) {
      throw new NotFoundError('Inquiry', id);
    }

    await inquiryRepo.updateStatus(id, status);
    return c.json({ success: true });
  }
);

export default app;

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
