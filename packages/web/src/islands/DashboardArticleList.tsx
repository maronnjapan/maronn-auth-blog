import { useState } from 'react';
import type { Article } from '@maronn-auth-blog/shared';

interface DashboardArticleListProps {
  articles: Article[];
}

const statusLabels: Record<string, { label: string; color: string }> = {
  published: { label: '公開済み', color: '#4caf50' },
  pending_new: { label: '審査待ち（新規）', color: '#ff9800' },
  pending_update: { label: '審査待ち（更新）', color: '#ff9800' },
  rejected: { label: '却下', color: '#f44336' },
  deleted: { label: '削除済み', color: '#9e9e9e' },
};

export default function DashboardArticleList({ articles: initialArticles }: DashboardArticleListProps) {
  const [articles] = useState<Article[]>(initialArticles);

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

        @media (max-width: 768px) {
          .article-table {
            min-width: 600px;
          }

          .article-table th,
          .article-table td {
            padding: 0.75rem;
            font-size: 0.9rem;
          }

          .rejection-reason {
            font-size: 0.8rem;
          }
        }

        @media (max-width: 480px) {
          .article-table {
            min-width: 500px;
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
