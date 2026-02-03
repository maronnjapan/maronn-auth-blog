import type { TargetCategory } from '@maronn-auth-blog/shared';
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
  targetCategories?: TargetCategory[];
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
                const { icon, label, key, color, bgColor } = getTargetCategoryMeta(category);
                return (
                  <div
                    key={key}
                    className="category-icon"
                    title={label}
                    style={{ backgroundColor: bgColor, color }}
                  >
                    <span className="icon" aria-hidden="true">{icon}</span>
                    <span className="label" style={{ color }}>{label}</span>
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
          border-radius: 16px;
          padding: 1.25rem;
          border: 1px solid rgba(0, 0, 0, 0.06);
          box-shadow: 0 2px 8px -2px rgba(0, 0, 0, 0.06);
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .article-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 12px 24px -8px rgba(0, 0, 0, 0.12);
          border-color: transparent;
        }

        .category-icons {
          display: flex;
          gap: 0.5rem;
          margin-bottom: 0.875rem;
          flex-wrap: wrap;
        }

        .category-icon {
          display: inline-flex;
          align-items: center;
          gap: 0.375rem;
          font-size: 0.6875rem;
          font-weight: 600;
          padding: 0.375rem 0.625rem;
          border-radius: 10px;
          transition: transform 0.15s ease, box-shadow 0.15s ease;
        }

        .category-icon:hover {
          transform: translateY(-1px);
          box-shadow: 0 2px 6px -1px rgba(0, 0, 0, 0.1);
        }

        .category-icon .icon {
          font-size: 0.9375rem;
        }

        .article-card-content h3 {
          margin: 0 0 0.5rem 0;
          font-size: 1.0625rem;
          font-weight: 600;
          line-height: 1.5;
        }

        .article-card-content h3 a {
          color: #1a1a2e;
          text-decoration: none;
          transition: color 0.2s ease;
        }

        .article-card-content h3 a:hover {
          color: #6366f1;
        }

        .category {
          display: inline-flex;
          align-items: center;
          font-size: 0.75rem;
          font-weight: 500;
          color: #0369a1;
          background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
          padding: 0.25rem 0.625rem;
          border-radius: 20px;
          margin-right: 0.5rem;
        }

        .meta {
          margin: 0.5rem 0 0 0;
          font-size: 0.8125rem;
          color: #64748b;
        }

        @media (max-width: 768px) {
          .article-card {
            padding: 1rem;
            border-radius: 12px;
          }

          .article-card-content h3 {
            font-size: 1rem;
          }
        }

        @media (max-width: 480px) {
          .article-card {
            padding: 0.875rem;
            border-radius: 10px;
          }

          .article-card-content h3 {
            font-size: 0.9375rem;
          }

          .category-icon {
            font-size: 0.625rem;
            padding: 0.25rem 0.5rem;
            border-radius: 8px;
          }

          .category-icons {
            gap: 0.375rem;
          }

          .meta {
            font-size: 0.75rem;
          }
        }
      `}</style>
    </div>
  );
}
