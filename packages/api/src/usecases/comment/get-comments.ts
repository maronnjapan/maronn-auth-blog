import { CommentRepository } from '../../infrastructure/repositories/comment-repository';
import { UserRepository } from '../../infrastructure/repositories/user-repository';
import type { Comment } from '../../domain/entities/comment';

export interface GetCommentsInput {
  articleId: string;
  limit?: number;
  offset?: number;
}

export interface CommentWithAuthor {
  comment: ReturnType<Comment['toJSON']>;
  author?: {
    id: string;
    username: string;
    displayName: string;
    iconUrl?: string;
  };
}

export interface GetCommentsOutput {
  comments: CommentWithAuthor[];
  total: number;
}

export class GetCommentsUsecase {
  constructor(
    private commentRepo: CommentRepository,
    private userRepo: UserRepository
  ) {}

  async execute(input: GetCommentsInput): Promise<GetCommentsOutput> {
    const limit = input.limit ?? 100;
    const offset = input.offset ?? 0;

    const [comments, total] = await Promise.all([
      this.commentRepo.findByArticleId(input.articleId, limit, offset),
      this.commentRepo.countByArticleId(input.articleId),
    ]);

    const authorCache = new Map<string, CommentWithAuthor['author']>();

    const commentsWithAuthor: CommentWithAuthor[] = await Promise.all(
      comments.map(async (comment) => {
        let author = authorCache.get(comment.userId);
        if (!author) {
          const user = await this.userRepo.findById(comment.userId);
          if (user) {
            const data = user.toJSON();
            author = {
              id: data.id,
              username: data.username,
              displayName: data.displayName,
              iconUrl: data.iconUrl,
            };
            authorCache.set(comment.userId, author);
          }
        }

        return {
          comment: comment.toJSON(),
          author,
        };
      })
    );

    return { comments: commentsWithAuthor, total };
  }
}
