import type { ArticleMeta, TargetCategory } from '../lib/content';
import { formatDate } from '../lib/content';
import { getTargetCategoryMeta } from '../lib/target-categories';

interface ArticleListProps {
  articles: ArticleMeta[];
  emptyMessage?: string;
}

export default function ArticleList({
  articles,
  emptyMessage = 'まだ記事がありません',
}: ArticleListProps) {
  if (articles.length === 0) {
    return (
      <div className="empty">
        <p>{emptyMessage}</p>

        <style>{`
          .empty {
            text-align: center;
            padding: 3rem 1rem;
            background: white;
            border-radius: 8px;
            color: #666;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="article-list">
      {articles.map((article) => {
        const publishedDate = formatDate(article.publishedAt);
        return (
          <a key={article.slug} href={`/articles/${article.slug}`} className="article-card-link">
            <article className="article-card">
              <span className="emoji" aria-hidden="true">
                {article.emoji}
              </span>
              <div className="article-card-content">
                <div className="category-icons" aria-label="対象カテゴリ">
                  {article.targetCategories.map((category: TargetCategory) => {
                    const { icon, label, key, color, bgColor } = getTargetCategoryMeta(category);
                    return (
                      <span
                        key={key}
                        className="category-icon"
                        title={label}
                        style={{ backgroundColor: bgColor, color }}
                      >
                        <span aria-hidden="true">{icon}</span>
                        <span>{label}</span>
                      </span>
                    );
                  })}
                </div>
                <h2>{article.title}</h2>
                <p className="excerpt">{article.excerpt}</p>
                <div className="meta">
                  {publishedDate && <time className="date">{publishedDate}</time>}
                  {article.topics.length > 0 && (
                    <span className="topics">
                      {article.topics.map((topic) => (
                        <span key={topic} className="topic">
                          {topic}
                        </span>
                      ))}
                    </span>
                  )}
                </div>
              </div>
            </article>
          </a>
        );
      })}

      <style>{`
        .article-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .article-card-link {
          text-decoration: none;
          color: inherit;
          display: block;
        }

        /* display: block が hidden 属性を打ち消してしまうため明示的に隠す（検索の絞り込み用） */
        .article-card-link[hidden] {
          display: none;
        }

        .article-card {
          display: flex;
          gap: 1rem;
          align-items: flex-start;
          background: white;
          border: 1px solid #e0e0e0;
          border-radius: 8px;
          padding: 1.25rem;
          transition: border-color 0.2s, box-shadow 0.2s;
        }

        .article-card-link:hover .article-card {
          border-color: #0066cc;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
        }

        .emoji {
          font-size: 2rem;
          line-height: 1;
          flex-shrink: 0;
        }

        .article-card-content {
          min-width: 0;
          flex: 1;
        }

        .category-icons {
          display: flex;
          flex-wrap: wrap;
          gap: 0.375rem;
          margin-bottom: 0.5rem;
        }

        .category-icon {
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
          padding: 0.125rem 0.5rem;
          border-radius: 999px;
          font-size: 0.75rem;
          font-weight: 500;
        }

        .article-card h2 {
          font-size: 1.125rem;
          margin: 0 0 0.375rem 0;
          color: #333;
          overflow-wrap: break-word;
        }

        .excerpt {
          font-size: 0.875rem;
          color: #666;
          margin: 0 0 0.5rem 0;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .meta {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 0.75rem;
          font-size: 0.8125rem;
          color: #999;
        }

        .topics {
          display: flex;
          flex-wrap: wrap;
          gap: 0.375rem;
        }

        .topic {
          background: #f5f5f5;
          border-radius: 999px;
          padding: 0.125rem 0.5rem;
        }

        @media (max-width: 480px) {
          .article-card {
            padding: 1rem;
            gap: 0.75rem;
          }

          .emoji {
            font-size: 1.5rem;
          }

          .article-card h2 {
            font-size: 1rem;
          }
        }
      `}</style>
    </div>
  );
}
