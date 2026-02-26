import type { ArticleRepository } from '../../infrastructure/repositories/article-repository';
import type { UserRepository } from '../../infrastructure/repositories/user-repository';
import type { Article } from '../../domain/entities/article';

export interface FeedArticle {
  id: string;
  slug: string;
  title: string;
  category?: string;
  topics: string[];
  authorUsername: string;
  authorDisplayName: string;
  publishedAt: string;
  updatedAt: string;
  articleUrl: string;
}

export class GetFeedArticlesUsecase {
  private static readonly LIMIT = 20;

  constructor(
    private readonly articleRepo: ArticleRepository,
    private readonly userRepo: UserRepository,
    private readonly webUrl: string,
  ) {}

  async execute(username?: string): Promise<FeedArticle[]> {
    const articles = username
      ? await this.getByUsername(username)
      : await this.articleRepo.findPublished(GetFeedArticlesUsecase.LIMIT, 0);

    const authorCache = new Map<string, { username: string; displayName: string }>();

    return Promise.all(
      articles.map(async (article) => {
        let author = authorCache.get(article.userId);
        if (!author) {
          const user = await this.userRepo.findById(article.userId);
          author = {
            username: user?.username ?? '',
            displayName: user?.displayName ?? '',
          };
          authorCache.set(article.userId, author);
        }

        const topics = await this.articleRepo.findTopics(article.id);
        const slug = article.slug.toString();

        return {
          id: article.id,
          slug,
          title: article.title,
          category: article.category,
          topics,
          authorUsername: author.username,
          authorDisplayName: author.displayName,
          publishedAt: article.publishedAt?.toISOString() ?? article.createdAt.toISOString(),
          updatedAt: article.updatedAt.toISOString(),
          articleUrl: `${this.webUrl}/${author.username}/articles/${slug}`,
        };
      })
    );
  }

  private async getByUsername(username: string): Promise<Article[]> {
    const user = await this.userRepo.findByUsername(username);
    if (!user) return [];
    return this.articleRepo.findPublishedByUserId(user.id);
  }
}
