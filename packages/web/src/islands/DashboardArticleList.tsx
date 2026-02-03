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
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (articleId: string, title: string) => {
    if (!confirm(`「${title}」を削除してもよろしいですか？\n\nこの操作は取り消せません。`)) {
      return;
    }

    setDeletingId(articleId);

    try {
      const response = await fetch(`${apiUrl}/dashboard/articles/${articleId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error?.message || '削除に失敗しました');
      }

      // Update the article status in the list
      setArticles((prev) =>
        prev.map((article) =>
          article.id === articleId ? { ...article, status: 'deleted' as const } : article
        )
      );
    } catch (error) {
      alert(error instanceof Error ? error.message : '削除に失敗しました');
    } finally {
      setDeletingId(null);
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
      <div className="table-wrapper">
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
              const isDeleted = article.status === 'deleted';
              const isDeleting = deletingId === article.id;
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
                    {!isDeleted && (
                      <button
                        className="delete-button"
                        onClick={() => handleDelete(article.id, article.title)}
                        disabled={isDeleting}
                      >
                        {isDeleting ? '削除中...' : '削除'}
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <style>{`
        .table-wrapper {
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
        }

        .delete-button {
          padding: 0.375rem 0.75rem;
          font-size: 0.875rem;
          color: #dc2626;
          background-color: transparent;
          border: 1px solid #dc2626;
          border-radius: 0.375rem;
          cursor: pointer;
          transition: background-color 0.2s, color 0.2s;
        }

        .delete-button:hover:not(:disabled) {
          background-color: #dc2626;
          color: white;
        }

        .delete-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        @media (max-width: 768px) {
          .article-table {
            min-width: 700px;
          }

          .article-table th,
          .article-table td {
            padding: 0.75rem;
            font-size: 0.9rem;
          }

          .rejection-reason {
            font-size: 0.8rem;
          }

          .delete-button {
            padding: 0.25rem 0.5rem;
            font-size: 0.8rem;
          }
        }

        @media (max-width: 480px) {
          .article-table {
            min-width: 600px;
          }

          .article-table th,
          .article-table td {
            padding: 0.5rem;
            font-size: 0.85rem;
          }
        }
      `}</style>
    </div>
  );
}
