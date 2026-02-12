import { useState } from 'react';
import type { Article, TargetCategory } from '@maronn-auth-blog/shared';
import { getTargetCategoryMeta } from '../lib/target-categories';

type ArticleWithAuthor = Article & {
  author?: {
    username: string;
  };
};

interface ArticleListProps {
  articles: ArticleWithAuthor[];
  bookmarkedIds?: string[];
  isLoggedIn?: boolean;
  apiUrl?: string;
}

function BookmarkCardButton({
  articleId,
  initialBookmarked,
  apiUrl,
  isLoggedIn,
}: {
  articleId: string;
  initialBookmarked: boolean;
  apiUrl: string;
  isLoggedIn: boolean;
}) {
  const [bookmarked, setBookmarked] = useState(initialBookmarked);
  const [loading, setLoading] = useState(false);

  const handleToggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isLoggedIn) {
      window.location.href = `${apiUrl}/auth/login`;
      return;
    }

    if (loading) return;
    setLoading(true);

    try {
      const method = bookmarked ? 'DELETE' : 'POST';
      const response = await fetch(`${apiUrl}/bookmarks/${articleId}`, {
        method,
        credentials: 'include',
      });

      if (response.ok) {
        setBookmarked(!bookmarked);
      }
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      className={`bookmark-btn ${bookmarked ? 'bookmarked' : ''}`}
      onClick={handleToggle}
      disabled={loading}
      title={bookmarked ? 'ブックマーク解除' : 'ブックマークに追加'}
      aria-label={bookmarked ? 'ブックマーク解除' : 'ブックマークに追加'}
    >
      <svg
        viewBox="0 0 24 24"
        width={16}
        height={16}
        fill={bookmarked ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth="2"
        aria-hidden="true"
      >
        <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
      </svg>
    </button>
  );
}

export default function ArticleList({
  articles,
  bookmarkedIds = [],
  isLoggedIn = false,
  apiUrl = '',
}: ArticleListProps) {
  if (articles.length === 0) {
    return (
      <div className="empty">
        <p>まだ記事がありません</p>
      </div>
    );
  }

  const bookmarkedSet = new Set(bookmarkedIds);

  return (
    <div className="article-list">
      {articles.map((article) => {
        const username = article.author?.username ?? article.userId;
        const targetCategories = article.targetCategories ?? [];
        return (
          <a
            key={article.id}
            href={`/${username}/articles/${article.slug}`}
            className="article-card-link"
          >
            <article className="article-card">
              <div className="category-icons" aria-label="対象カテゴリ">
                {targetCategories.map((category: TargetCategory) => {
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
                <h2>{article.title}</h2>
                {article.category && (
                  <span className="category">{article.category}</span>
                )}
                <div className="meta">
                  <p className="date">
                    公開日: {new Date(article.publishedAt!).toLocaleDateString('ja-JP')}
                  </p>
                  {article.updatedAt && new Date(article.updatedAt).getTime() !== new Date(article.publishedAt!).getTime() && (
                    <p className="date">
                      更新日: {new Date(article.updatedAt).toLocaleDateString('ja-JP')}
                    </p>
                  )}
                </div>
              </div>
              {apiUrl && (
                <div className="article-card-footer">
                  <BookmarkCardButton
                    articleId={article.id}
                    initialBookmarked={bookmarkedSet.has(article.id)}
                    apiUrl={apiUrl}
                    isLoggedIn={isLoggedIn}
                  />
                </div>
              )}
            </article>
          </a>
        );
      })}
    </div>
  );
}
