interface SeriesArticle {
  id: string;
  slug: string;
  title: string;
  orderIndex: number;
}

interface SeriesInfo {
  id: string;
  title: string;
  slug: string;
  description?: string;
  status: string;
  articles: SeriesArticle[];
  orderIndex: number;
}

interface SeriesNavigationProps {
  seriesList: SeriesInfo[];
  currentArticleId: string;
  authorUsername: string;
}

export default function SeriesNavigation({
  seriesList,
  currentArticleId,
  authorUsername,
}: SeriesNavigationProps) {
  if (seriesList.length === 0) return null;

  return (
    <div className="series-navigation">
      {seriesList.map((series) => {
        const currentIndex = series.articles.findIndex(
          (a) => a.id === currentArticleId
        );
        const prevArticle = currentIndex > 0 ? series.articles[currentIndex - 1] : null;
        const nextArticle =
          currentIndex < series.articles.length - 1
            ? series.articles[currentIndex + 1]
            : null;

        return (
          <div key={series.id} className="series-card">
            <div className="series-header">
              <span className="series-label">
                {series.status === 'completed' ? '完結済みシリーズ' : 'シリーズ'}
              </span>
              <a
                href={`/${authorUsername}/series/${series.slug}`}
                className="series-title"
              >
                {series.title}
              </a>
              <span className="series-progress">
                {currentIndex + 1} / {series.articles.length}
              </span>
            </div>

            <div className="series-articles">
              {series.articles.map((article, idx) => (
                <div
                  key={article.id}
                  className={`series-article ${article.id === currentArticleId ? 'current' : ''}`}
                >
                  <span className="article-number">{idx + 1}</span>
                  {article.id === currentArticleId ? (
                    <span className="article-title-current">{article.title}</span>
                  ) : (
                    <a
                      href={`/${authorUsername}/articles/${article.slug}`}
                      className="article-title-link"
                    >
                      {article.title}
                    </a>
                  )}
                </div>
              ))}
            </div>

            <div className="series-nav-buttons">
              {prevArticle && (
                <a
                  href={`/${authorUsername}/articles/${prevArticle.slug}`}
                  className="nav-btn nav-prev"
                >
                  <svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M15 18l-6-6 6-6" />
                  </svg>
                  <span>前の記事</span>
                </a>
              )}
              {nextArticle && (
                <a
                  href={`/${authorUsername}/articles/${nextArticle.slug}`}
                  className="nav-btn nav-next"
                >
                  <span>次の記事</span>
                  <svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </a>
              )}
            </div>
          </div>
        );
      })}

      <style>{`
        .series-navigation {
          margin-top: 2rem;
          margin-bottom: 2rem;
        }
        .series-card {
          background: #f8f9fb;
          border: 1px solid #e1e7f0;
          border-radius: 8px;
          padding: 1.25rem;
          margin-bottom: 1rem;
        }
        .series-header {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          flex-wrap: wrap;
          margin-bottom: 1rem;
        }
        .series-label {
          font-size: 0.75rem;
          font-weight: 600;
          color: #6366f1;
          background: #eef2ff;
          padding: 0.2rem 0.5rem;
          border-radius: 4px;
        }
        .series-title {
          font-size: 1rem;
          font-weight: 600;
          color: #333;
          text-decoration: none;
        }
        .series-title:hover {
          color: #6366f1;
          text-decoration: underline;
        }
        .series-progress {
          font-size: 0.8rem;
          color: #888;
          margin-left: auto;
        }
        .series-articles {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          margin-bottom: 1rem;
          max-height: 200px;
          overflow-y: auto;
        }
        .series-article {
          display: flex;
          align-items: baseline;
          gap: 0.5rem;
          font-size: 0.85rem;
          line-height: 1.4;
        }
        .series-article.current {
          font-weight: 600;
        }
        .article-number {
          color: #999;
          font-size: 0.75rem;
          font-variant-numeric: tabular-nums;
          min-width: 1.5rem;
          flex-shrink: 0;
        }
        .series-article.current .article-number {
          color: #6366f1;
        }
        .article-title-current {
          color: #333;
        }
        .article-title-link {
          color: #666;
          text-decoration: none;
        }
        .article-title-link:hover {
          color: #6366f1;
          text-decoration: underline;
        }
        .series-nav-buttons {
          display: flex;
          justify-content: space-between;
          gap: 0.75rem;
        }
        .nav-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          padding: 0.5rem 0.75rem;
          font-size: 0.85rem;
          font-weight: 500;
          color: #6366f1;
          background: white;
          border: 1px solid #d4d9e6;
          border-radius: 6px;
          text-decoration: none;
          transition: all 0.2s;
        }
        .nav-btn:hover {
          background: #eef2ff;
          border-color: #6366f1;
        }
        .nav-next {
          margin-left: auto;
        }
      `}</style>
    </div>
  );
}
