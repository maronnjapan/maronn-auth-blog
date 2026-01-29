import { CommentRepository } from '../../infrastructure/repositories/comment-repository';
import { CommentNotFoundError } from '../../domain/errors/domain-errors';
import { ForbiddenError } from '@maronn-auth-blog/shared';

export interface DeleteCommentInput {
  commentId: string;
  userId: string;
  isAdmin: boolean;
}

export class DeleteCommentUsecase {
  constructor(private commentRepo: CommentRepository) {}

  async execute(input: DeleteCommentInput): Promise<void> {
    console.info(`[DeleteComment] Deleting comment: ${input.commentId}`);

    const comment = await this.commentRepo.findById(input.commentId);
    if (!comment) {
      throw new CommentNotFoundError(input.commentId);
    }

    if (!comment.isOwnedBy(input.userId) && !input.isAdmin) {
      throw new ForbiddenError('You can only delete your own comments');
    }

    await this.commentRepo.delete(input.commentId);

    console.info(`[DeleteComment] Comment deleted: ${input.commentId}`);
  }
}
