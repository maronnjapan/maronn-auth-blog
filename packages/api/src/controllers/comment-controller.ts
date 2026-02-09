import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import type { Env } from '../types/env';
import { requireAuth } from '../middleware/auth';
import { CommentRepository } from '../infrastructure/repositories/comment-repository';
import { ArticleRepository } from '../infrastructure/repositories/article-repository';
import { UserRepository } from '../infrastructure/repositories/user-repository';
import { CreateCommentUsecase } from '../usecases/comment/create-comment';
import { GetCommentsUsecase } from '../usecases/comment/get-comments';
import { DeleteCommentUsecase } from '../usecases/comment/delete-comment';
import { ValidationError } from '@maronn-auth-blog/shared';
import { commentInputSchema } from '@maronn-auth-blog/shared';
import markdownToHtmlImport from 'zenn-markdown-html';
import { optimizeImageData } from '../utils/image-optimizer';

type MarkdownToHtmlFn = (markdown: string, options: { embedOrigin: string }) => string;

const markdownToHtml: MarkdownToHtmlFn =
  typeof markdownToHtmlImport === 'function'
    ? (markdownToHtmlImport as MarkdownToHtmlFn)
    : ((markdownToHtmlImport as unknown as { default: MarkdownToHtmlFn }).default as MarkdownToHtmlFn);

const MAX_COMMENT_IMAGES = 5;

const escapeRegExp = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const getCommentImageBase = (imageUrl: string): string => {
  const normalized = imageUrl.endsWith('/') ? imageUrl.slice(0, -1) : imageUrl;
  return `${normalized}/comment-images/`;
};

const countCommentImages = (html: string, imageUrl: string): number => {
  if (!html) {
    return 0;
  }
  const base = escapeRegExp(getCommentImageBase(imageUrl));
  const regex = new RegExp(`src=["']${base}[^"']+["']`, 'g');
  const matches = html.match(regex);
  return matches ? matches.length : 0;
};

const app = new Hono<{ Bindings: Env }>();

// GET /comments/articles/:articleId - Get comments for an article
app.get(
  '/articles/:articleId',
  async (c) => {
    const articleId = c.req.param('articleId');

    const commentRepo = new CommentRepository(c.env.DB);
    const userRepo = new UserRepository(c.env.DB);
    const usecase = new GetCommentsUsecase(commentRepo, userRepo);

    const result = await usecase.execute({ articleId });

    return c.json({
      comments: result.comments.map((item) => ({
        ...item.comment,
        author: item.author,
      })),
      total: result.total,
    });
  }
);

// POST /comments/articles/:articleId - Create a comment
app.post(
  '/articles/:articleId',
  requireAuth(),
  zValidator('json', commentInputSchema),
  async (c) => {
    const articleId = c.req.param('articleId');
    const { bodyMarkdown } = c.req.valid('json');
    const auth = c.get('auth')!;

    // Convert markdown to HTML on the server
    const bodyHtml = markdownToHtml(bodyMarkdown, { embedOrigin: c.env.EMBED_ORIGIN });

    const imageCount = countCommentImages(bodyHtml, c.env.IMAGE_URL);
    if (imageCount > MAX_COMMENT_IMAGES) {
      throw new ValidationError(`コメントに添付できる画像は最大${MAX_COMMENT_IMAGES}枚までです`);
    }

    const commentRepo = new CommentRepository(c.env.DB);
    const articleRepo = new ArticleRepository(c.env.DB);
    const usecase = new CreateCommentUsecase(commentRepo, articleRepo);

    const comment = await usecase.execute({
      articleId,
      userId: auth.userId,
      bodyMarkdown,
      bodyHtml,
    });

    // Get author info for response
    const userRepo = new UserRepository(c.env.DB);
    const user = await userRepo.findById(auth.userId);
    const author = user ? {
      id: user.toJSON().id,
      username: user.toJSON().username,
      displayName: user.toJSON().displayName,
      iconUrl: user.toJSON().iconUrl,
    } : undefined;

    return c.json({
      ...comment.toJSON(),
      author,
    }, 201);
  }
);

// DELETE /comments/:commentId - Delete a comment
app.delete(
  '/:commentId',
  requireAuth(),
  async (c) => {
    const commentId = c.req.param('commentId');
    const auth = c.get('auth')!;
    const isAdmin = auth.permissions?.some((p) => p === 'admin:users') ?? false;

    const commentRepo = new CommentRepository(c.env.DB);
    const usecase = new DeleteCommentUsecase(commentRepo);

    await usecase.execute({
      commentId,
      userId: auth.userId,
      isAdmin,
    });

    return c.json({ success: true });
  }
);

// POST /comments/images - Upload an image for a comment
app.post(
  '/images',
  requireAuth(),
  async (c) => {
    const auth = c.get('auth')!;
    const contentType = c.req.header('content-type') || '';

    if (!contentType.includes('multipart/form-data')) {
      throw new ValidationError('Content-Type must be multipart/form-data');
    }

    const formData = await c.req.formData();
    const file = formData.get('image');

    if (!file || typeof (file as unknown as Record<string, unknown>).arrayBuffer !== 'function') {
      throw new ValidationError('Image file is required');
    }

    const imageFile = file as unknown as { name: string; type: string; size: number; arrayBuffer(): Promise<ArrayBuffer> };

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.some((type) => imageFile.type.startsWith(type))) {
      throw new ValidationError(`Unsupported file type: ${imageFile.type}. Allowed: jpg, png, webp, gif`);
    }

    const maxSize = 3 * 1024 * 1024; // 3 MB
    if (imageFile.size > maxSize) {
      throw new ValidationError('File size exceeds maximum of 3MB');
    }

    const data = await imageFile.arrayBuffer();
    const ext = imageFile.name.split('.').pop() || 'png';
    const filename = `${crypto.randomUUID()}.${ext}`;

    // Optimize image before storing
    const optimized = await optimizeImageData(data, imageFile.type);

    const key = `comment-images/${auth.userId}/${filename}`;
    await c.env.R2.put(key, optimized.data, {
      httpMetadata: { contentType: optimized.contentType },
    });

    const imageUrl = `${c.env.IMAGE_URL}/comment-images/${auth.userId}/${filename}`;

    return c.json({ url: imageUrl }, 201);
  }
);

// POST /comments/preview - Preview markdown as HTML (requires auth)
app.post(
  '/preview',
  requireAuth(),
  zValidator('json', commentInputSchema),
  async (c) => {
    const { bodyMarkdown } = c.req.valid('json');
    const html = markdownToHtml(bodyMarkdown, { embedOrigin: c.env.EMBED_ORIGIN });
    const imageCount = countCommentImages(html, c.env.IMAGE_URL);
    if (imageCount > MAX_COMMENT_IMAGES) {
      throw new ValidationError(`コメントに添付できる画像は最大${MAX_COMMENT_IMAGES}枚までです`);
    }
    return c.json({ html });
  }
);

export default app;
