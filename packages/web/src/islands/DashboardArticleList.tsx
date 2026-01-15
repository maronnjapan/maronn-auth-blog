import { useState } from 'react';
import type { Article } from '@maronn-auth-blog/shared';

interface DashboardArticleListProps {
  articles: Article[];
  apiUrl: string;
}

const statusLabels: Record<string, { label: string; color: string }> = {
  published: { label: '公開済み', color: '#4caf50' },
  pending_new: { label: '審査待ち（新規）', color: '#ff9800' },
  pending_update: { label: '審査待ち（更新）', color: '#ff9800' },
  rejected: { label: '却下', color: '#f44336' },
  deleted: { label: '削除済み', color: '#9e9e9e' },
};

export default function DashboardArticleList({ articles: initialArticles, apiUrl }: DashboardArticleListProps) {
  const [articles, setArticles] = useState<Article[]>(initialArticles);

  const handleDelete = async (articleId: string) => {
    if (!confirm('本当に削除しますか？')) {
      return;
    }

    try {
      const response = await fetch(`${apiUrl}/articles/${articleId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('削除に失敗しました');
      }

      setArticles(articles.filter((a) => a.id !== articleId));
    } catch (err) {
      alert(err instanceof Error ? err.message : '削除に失敗しました');
    }
  };

  if (articles.length === 0) {
    return (
      <div className="empty">
        <p>まだ記事がありません</p>
        <p>GitHubリポジトリに記事を追加してください</p>
      </div>
    );
  }

  return (
    <div className="article-list">
      <table className="article-table">
        <thead>
          <tr>
            <th>タイトル</th>
            <th>ステータス</th>
            <th>作成日</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          {articles.map((article) => {
            const status = statusLabels[article.status] || {
              label: article.status,
              color: '#666',
            };
            return (
              <tr key={article.id}>
                <td>
                  <strong>{article.title}</strong>
                  {article.rejectionReason && (
                    <p className="rejection-reason">却下理由: {article.rejectionReason}</p>
                  )}
                </td>
                <td>
                  <span
                    className="status-badge"
                    style={{ backgroundColor: status.color }}
                  >
                    {status.label}
                  </span>
                </td>
                <td>{new Date(article.createdAt).toLocaleDateString('ja-JP')}</td>
                <td>
                  <button
                    onClick={() => handleDelete(article.id)}
                    className="btn-delete"
                  >
                    削除
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
