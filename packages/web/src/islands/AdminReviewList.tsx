import type { Article } from '@maronn-auth-blog/shared';

interface AdminReviewListProps {
  articles: Article[];
}

export default function AdminReviewList({ articles }: AdminReviewListProps) {
  if (articles.length === 0) {
    return (
      <div className="empty">
        <p>審査待ちの記事はありません</p>
      </div>
    );
  }

  return (
    <div className="review-list">
      <div className="table-wrapper">
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

      <style>{`
        .table-wrapper {
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
        }

        @media (max-width: 768px) {
          .review-table {
            min-width: 700px;
          }

          .review-table th,
          .review-table td {
            padding: 0.75rem;
            font-size: 0.9rem;
          }

          .btn-review {
            padding: 0.4rem 0.8rem;
            font-size: 0.85rem;
          }
        }

        @media (max-width: 480px) {
          .review-table {
            min-width: 600px;
          }

          .review-table th,
          .review-table td {
            padding: 0.5rem;
            font-size: 0.85rem;
          }

          .btn-review {
            padding: 0.35rem 0.7rem;
            font-size: 0.8rem;
          }
        }
      `}</style>
    </div>
  );
}
