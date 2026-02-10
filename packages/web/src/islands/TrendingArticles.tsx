import type { TargetCategory } from '@maronn-auth-blog/shared';
import { getTargetCategoryMeta } from '../lib/target-categories';

interface TrendingArticle {
  id: string;
  slug: string;
  title: string;
  category?: string;
  publishedAt: string;
  views: number;
  targetCategories?: TargetCategory[];
  author?: {
    username: string;
    displayName: string;
    iconUrl?: string;
  };
}

interface TrendingArticlesProps {
  articles: TrendingArticle[];
  title?: string;
}

function formatViews(views: number): string {
  if (views >= 1000) {
    return `${(views / 1000).toFixed(1)}k`;
  }
  return String(views);
}

export default function TrendingArticles({
  articles,
  title = '注目の記事',
}: TrendingArticlesProps) {
  if (articles.length === 0) {
    return null;
  }

  return (
    <section className="trending-section">
      <h2 className="trending-title">{title}</h2>
      <div className="trending-list">
        {articles.map((article, index) => {
          const username = article.author?.username ?? '';
          const targetCategories = article.targetCategories ?? [];
          return (
            <a
              key={article.id}
              href={`/${username}/articles/${article.slug}`}
              className="trending-card-link"
            >
              <article className="trending-card">
                <div className="trending-rank">{index + 1}</div>
                <div className="trending-content">
                  <div className="trending-category-icons">
                    {targetCategories.map((category) => {
                      const { icon, label, key, color, bgColor } = getTargetCategoryMeta(category);
                      return (
                        <span
                          key={key}
                          className="trending-category-icon"
                          title={label}
                          style={{ backgroundColor: bgColor, color }}
                        >
                          <span className="icon" aria-hidden="true">{icon}</span>
                        </span>
                      );
                    })}
                  </div>
                  <h3 className="trending-card-title">{article.title}</h3>
                  <div className="trending-meta">
                    {article.author && (
                      <span className="trending-author">{article.author.displayName}</span>
                    )}
                    <span className="trending-views">{formatViews(article.views)} views</span>
                  </div>
                </div>
              </article>
            </a>
          );
        })}
      </div>
      <style>{`
        .trending-section {
          margin-bottom: 2rem;
        }

        .trending-title {
          font-size: 1.25rem;
          font-weight: 700;
          color: #1a1a2e;
          margin-bottom: 1rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .trending-title::before {
          content: '';
          display: inline-block;
          width: 4px;
          height: 1.25em;
          background: linear-gradient(180deg, #f59e0b, #ef4444);
          border-radius: 2px;
        }

        .trending-list {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .trending-card-link {
          text-decoration: none;
          color: inherit;
        }

        .trending-card-link:hover .trending-card {
          transform: translateX(4px);
          border-color: #e2e8f0;
          background: #fafbfc;
        }

        .trending-card-link:hover .trending-card-title {
          color: #6366f1;
        }

        .trending-card {
          display: flex;
          align-items: flex-start;
          gap: 0.875rem;
          padding: 0.875rem 1rem;
          background: white;
          border-radius: 12px;
          border: 1px solid rgba(0, 0, 0, 0.06);
          transition: all 0.2s ease;
        }

        .trending-rank {
          flex-shrink: 0;
          width: 1.75rem;
          height: 1.75rem;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.8125rem;
          font-weight: 700;
          color: #94a3b8;
          background: #f1f5f9;
          border-radius: 8px;
          margin-top: 0.125rem;
        }

        .trending-card:nth-child(1) .trending-rank,
        .trending-card-link:first-child .trending-rank {
          background: linear-gradient(135deg, #fef3c7, #fde68a);
          color: #92400e;
        }

        .trending-card-link:nth-child(2) .trending-rank {
          background: linear-gradient(135deg, #f1f5f9, #e2e8f0);
          color: #475569;
        }

        .trending-card-link:nth-child(3) .trending-rank {
          background: linear-gradient(135deg, #fef3c7, #fed7aa);
          color: #9a3412;
        }

        .trending-content {
          flex: 1;
          min-width: 0;
        }

        .trending-category-icons {
          display: flex;
          gap: 0.25rem;
          margin-bottom: 0.375rem;
        }

        .trending-category-icon {
          display: inline-flex;
          align-items: center;
          padding: 0.125rem 0.375rem;
          border-radius: 6px;
          font-size: 0.75rem;
        }

        .trending-category-icon .icon {
          font-size: 0.75rem;
          line-height: 1;
        }

        .trending-card-title {
          font-size: 0.9375rem;
          font-weight: 600;
          color: #1a1a2e;
          line-height: 1.5;
          margin: 0;
          transition: color 0.2s ease;
          overflow: hidden;
          text-overflow: ellipsis;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
        }

        .trending-meta {
          display: flex;
          align-items: center;
          gap: 0.625rem;
          margin-top: 0.375rem;
          font-size: 0.75rem;
          color: #94a3b8;
        }

        .trending-author {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .trending-views {
          flex-shrink: 0;
          font-weight: 600;
          color: #f59e0b;
        }

        @media (max-width: 768px) {
          .trending-section {
            margin-bottom: 1.5rem;
          }

          .trending-title {
            font-size: 1.125rem;
          }

          .trending-card {
            padding: 0.75rem;
            gap: 0.75rem;
          }

          .trending-card-title {
            font-size: 0.875rem;
          }
        }

        @media (max-width: 480px) {
          .trending-section {
            margin-bottom: 1.25rem;
          }

          .trending-title {
            font-size: 1rem;
          }

          .trending-card {
            padding: 0.625rem 0.75rem;
            gap: 0.625rem;
            border-radius: 10px;
          }

          .trending-rank {
            width: 1.5rem;
            height: 1.5rem;
            font-size: 0.75rem;
            border-radius: 6px;
          }

          .trending-card-title {
            font-size: 0.8125rem;
          }

          .trending-meta {
            font-size: 0.6875rem;
          }
        }
      `}</style>
    </section>
  );
}
