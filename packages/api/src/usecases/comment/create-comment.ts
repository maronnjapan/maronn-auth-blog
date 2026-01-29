import { CommentRepository } from '../../infrastructure/repositories/comment-repository';
import { ArticleRepository } from '../../infrastructure/repositories/article-repository';
import { Comment, type CommentProps } from '../../domain/entities/comment';
import { ArticleNotFoundError } from '../../domain/errors/domain-errors';

export interface CreateCommentInput {
  articleId: string;
  userId: string;
  bodyMarkdown: string;
  bodyHtml: string;
}

export class CreateCommentUsecase {
  constructor(
    private commentRepo: CommentRepository,
    private articleRepo: ArticleRepository
  ) {}

  async execute(input: CreateCommentInput): Promise<Comment> {
    console.info(`[CreateComment] Creating comment for article: ${input.articleId}`);

    const article = await this.articleRepo.findById(input.articleId);
    if (!article) {
      throw new ArticleNotFoundError(input.articleId);
    }

    const now = new Date();
    const props: CommentProps = {
      id: crypto.randomUUID(),
      articleId: input.articleId,
      userId: input.userId,
      bodyMarkdown: input.bodyMarkdown,
      bodyHtml: input.bodyHtml,
      createdAt: now,
      updatedAt: now,
    };

    const comment = new Comment(props);
    await this.commentRepo.save(comment);

    console.info(`[CreateComment] Comment created: ${comment.id}`);
    return comment;
  }
}
