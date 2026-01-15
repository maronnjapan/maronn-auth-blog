import { useEffect, useState } from 'react';
import type { Article } from '@maronn-auth-blog/shared';

interface AdminReviewListProps {
  apiUrl: string;
}

export default function AdminReviewList({ apiUrl }: AdminReviewListProps) {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchArticles = async () => {
      try {
        const response = await fetch(`${apiUrl}/admin/reviews`, {
          credentials: 'include',
        });

        if (!response.ok) {
          if (response.status === 403) {
            throw new Error('管理者権限が必要です');
          }
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
    return <div className="loading"><p>読み込み中...</p></div>;
  }

  if (error) {
    return <div className="error"><p>エラー: {error}</p></div>;
  }

  if (articles.length === 0) {
    return (
      <div className="empty">
        <p>審査待ちの記事はありません</p>
      </div>
    );
  }

  return (
    <div className="review-list">
      <table className="review-table">
        <thead>
          <tr>
            <th>タイトル</th>
            <th>ユーザー</th>
            <th>ステータス</th>
            <th>作成日</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          {articles.map((article) => (
            <tr key={article.id}>
              <td>
                <strong>{article.title}</strong>
              </td>
              <td>{article.userId}</td>
              <td>
                <span className={`status-badge ${article.status}`}>
                  {article.status === 'pending_new' ? '新規' : '更新'}
                </span>
              </td>
              <td>{new Date(article.createdAt).toLocaleDateString('ja-JP')}</td>
              <td>
                <a
                  href={`/admin/reviews/${article.id}`}
                  className="btn-review"
                >
                  審査する
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
