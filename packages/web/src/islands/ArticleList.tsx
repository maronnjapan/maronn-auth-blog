import { useEffect, useState } from 'react';
import type { Article } from '@maronn-auth-blog/shared';

interface ArticleListProps {
  apiUrl: string;
}

export default function ArticleList({ apiUrl }: ArticleListProps) {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchArticles = async () => {
      try {
        const response = await fetch(`${apiUrl}/articles`, {
          credentials: 'include',
        });

        if (!response.ok) {
          throw new Error('記事の取得に失敗しました');
        }

        const data = await response.json();
        setArticles(data.articles || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : '不明なエラー');
      } finally {
        setLoading(false);
      }
    };

    fetchArticles();
  }, [apiUrl]);

  if (loading) {
    return (
      <div className="loading">
        <p>読み込み中...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error">
        <p>エラー: {error}</p>
      </div>
    );
  }

  if (articles.length === 0) {
    return (
      <div className="empty">
        <p>まだ記事がありません</p>
      </div>
    );
  }

  return (
    <div className="article-list">
      {articles.map((article) => (
        <article key={article.id} className="article-card">
          <h2>
            <a href={`/${article.userId}/articles/${article.slug}`}>
              {article.title}
            </a>
          </h2>
          {article.category && (
            <span className="category">{article.category}</span>
          )}
          <p className="meta">
            公開日: {new Date(article.publishedAt!).toLocaleDateString('ja-JP')}
          </p>
        </article>
      ))}
    </div>
  );
}
