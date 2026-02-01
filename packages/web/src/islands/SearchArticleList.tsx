import { getTargetCategoryMeta } from '../lib/target-categories';

type MatchType = 'and' | 'or';

interface SearchArticle {
  id: string;
  slug: string;
  title: string;
  category?: string;
  publishedAt: string;
  matchType: MatchType;
  author?: {
    username: string;
  };
  userId?: string;
  targetCategories?: string[];
}

interface SearchArticleListProps {
  articles: SearchArticle[];
}

export default function SearchArticleList({ articles }: SearchArticleListProps) {
  if (articles.length === 0) {
    return (
      <div className="empty">
        <p>記事が見つかりませんでした</p>
        <style>{`
          .empty {
            text-align: center;
            padding: 2rem 1rem;
            background: white;
            border-radius: 8px;
            color: #999;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="article-list">
      {articles.map((article) => {
        const username = article.author?.username ?? article.userId;
        const targetCategories = article.targetCategories ?? [];
        return (
          <article key={article.id} className="article-card">
            <div className="category-icons" aria-label="対象カテゴリ">
              {targetCategories.map((category) => {
                const { icon, label, key } = getTargetCategoryMeta(category);
                return (
                  <div key={key} className="category-icon" title={label}>
                    <span className="icon" aria-hidden="true">{icon}</span>
                    <span className="label">{label}</span>
                  </div>
                );
              })}
            </div>
            <div className="article-card-content">
              <h3>
                <a href={`/${username}/articles/${article.slug}`}>
                  {article.title}
                </a>
              </h3>
              {article.category && (
                <span className="category">{article.category}</span>
              )}
              <p className="meta">
                公開日: {new Date(article.publishedAt).toLocaleDateString('ja-JP')}
              </p>
            </div>
          </article>
        );
      })}
      <style>{`
        .article-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .article-card {
          background: white;
          border-radius: 8px;
          padding: 1.25rem;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          transition: box-shadow 0.2s ease;
        }

        .article-card:hover {
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
        }

        .category-icons {
          display: flex;
          gap: 0.5rem;
          margin-bottom: 0.75rem;
          flex-wrap: wrap;
        }

        .category-icon {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          font-size: 0.75rem;
          color: #666;
          background: #f5f5f5;
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
        }

        .category-icon .icon {
          font-size: 0.875rem;
        }

        .article-card-content h3 {
          margin: 0 0 0.5rem 0;
          font-size: 1.125rem;
          line-height: 1.4;
        }

        .article-card-content h3 a {
          color: #333;
          text-decoration: none;
        }

        .article-card-content h3 a:hover {
          color: #0066cc;
          text-decoration: underline;
        }

        .category {
          display: inline-block;
          font-size: 0.75rem;
          color: #666;
          background: #e3f2fd;
          padding: 0.125rem 0.5rem;
          border-radius: 4px;
          margin-right: 0.5rem;
        }

        .meta {
          margin: 0.5rem 0 0 0;
          font-size: 0.8125rem;
          color: #888;
        }

        @media (max-width: 768px) {
          .article-card {
            padding: 1rem;
          }

          .article-card-content h3 {
            font-size: 1rem;
          }
        }

        @media (max-width: 480px) {
          .article-card {
            padding: 0.875rem;
          }

          .article-card-content h3 {
            font-size: 0.9375rem;
          }

          .category-icon {
            font-size: 0.7rem;
            padding: 0.2rem 0.4rem;
          }

          .meta {
            font-size: 0.75rem;
          }
        }
      `}</style>
    </div>
  );
}
