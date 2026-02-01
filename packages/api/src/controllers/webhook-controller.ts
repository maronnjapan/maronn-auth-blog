import { Hono } from 'hono';
import type { Env } from '../types/env';
import { ArticleRepository } from '../infrastructure/repositories/article-repository';
import { UserRepository } from '../infrastructure/repositories/user-repository';
import { RepositoryRepository } from '../infrastructure/repositories/repository-repository';
import { NotificationRepository } from '../infrastructure/repositories/notification-repository';
import { GitHubClient } from '../infrastructure/github-client';
import { ProcessGitHubPushUsecase, type GitHubPushEvent } from '../usecases/webhook/process-github-push';
import { KVClient } from '../infrastructure/storage/kv-client';
import { R2Client } from '../infrastructure/storage/r2-client';
import { InvalidWebhookSignatureError } from '../domain/errors/domain-errors';

const app = new Hono<{ Bindings: Env }>();

// POST /webhook/github - GitHub webhook endpoint
app.post('/github', async (c) => {
  const signature = c.req.header('x-hub-signature-256');
  if (!signature) {
    throw new InvalidWebhookSignatureError();
  }

  const event = c.req.header('x-github-event');

  // Get raw body for signature verification
  const payload = await c.req.text();

  const githubClient = new GitHubClient(c.env.GITHUB_APP_ID, c.env.GITHUB_APP_PRIVATE_KEY);
  const isValid = await githubClient.verifyWebhookSignature(
    payload,
    signature,
    c.env.GITHUB_WEBHOOK_SECRET
  );
  if (!isValid) {
    throw new InvalidWebhookSignatureError();
  }

  // Only handle push events
  if (event !== 'push') {
    console.info(`[Webhook] Ignoring event: ${event}`);
    return c.json({ ok: true, message: `Event ${event} ignored` });
  }

  const data = JSON.parse(payload) as GitHubPushEvent;

  // Process the push event
  const articleRepo = new ArticleRepository(c.env.DB);
  const userRepo = new UserRepository(c.env.DB);
  const repoRepo = new RepositoryRepository(c.env.DB);
  const notificationRepo = new NotificationRepository(c.env.DB);
  const kvClient = new KVClient(c.env.KV);
  const r2Client = new R2Client(c.env.R2);

  const usecase = new ProcessGitHubPushUsecase(
    articleRepo,
    userRepo,
    repoRepo,
    notificationRepo,
    githubClient,
    kvClient,
    r2Client,
    c.env.IMAGE_URL
  );

  await usecase.execute(data);

  return c.json({ ok: true });
});

export default app;
