import { useEffect, useState } from 'react';
import type { Article } from '@maronn-auth-blog/shared';

interface UserArticleListProps {
  apiUrl: string;
  username: string;
}

export default function UserArticleList({ apiUrl, username }: UserArticleListProps) {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchArticles = async () => {
      try {
        const response = await fetch(`${apiUrl}/users/${username}/articles`, {
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
  }, [apiUrl, username]);

  if (loading) {
    return <div className="loading"><p>読み込み中...</p></div>;
  }

  if (error) {
    return <div className="error"><p>エラー: {error}</p></div>;
  }

  if (articles.length === 0) {
    return <div className="empty"><p>まだ記事がありません</p></div>;
  }

  return (
    <div className="article-list">
      {articles.map((article) => (
        <article key={article.id} className="article-card">
          <h3>
            <a href={`/${username}/articles/${article.slug}`}>
              {article.title}
            </a>
          </h3>
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
