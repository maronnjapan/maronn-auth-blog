import { useEffect, useState } from 'react';
import type { Article } from '@maronn-auth-blog/shared';

interface AdminReviewDetailProps {
  apiUrl: string;
  articleId: string;
}

export default function AdminReviewDetail({ apiUrl, articleId }: AdminReviewDetailProps) {
  const [article, setArticle] = useState<Article | null>(null);
  const [html, setHtml] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  useEffect(() => {
    const fetchArticle = async () => {
      try {
        const response = await fetch(`${apiUrl}/admin/reviews/${articleId}`, {
          credentials: 'include',
        });

        if (!response.ok) {
          throw new Error('記事の取得に失敗しました');
        }

        const data = await response.json();
        setArticle(data.article);
        setHtml(data.html || '');
      } catch (err) {
        setError(err instanceof Error ? err.message : '不明なエラー');
      } finally {
        setLoading(false);
      }
    };

    fetchArticle();
  }, [apiUrl, articleId]);

  const handleApprove = async () => {
    if (!confirm('この記事を承認しますか？')) {
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`${apiUrl}/admin/reviews/${articleId}/approve`, {
        method: 'POST',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('承認に失敗しました');
      }

      alert('記事を承認しました');
      window.location.href = '/admin/reviews';
    } catch (err) {
      alert(err instanceof Error ? err.message : '承認に失敗しました');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      alert('却下理由を入力してください');
      return;
    }

    if (!confirm('この記事を却下しますか？')) {
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`${apiUrl}/admin/reviews/${articleId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ reason: rejectionReason }),
      });

      if (!response.ok) {
        throw new Error('却下に失敗しました');
      }

      alert('記事を却下しました');
      window.location.href = '/admin/reviews';
    } catch (err) {
      alert(err instanceof Error ? err.message : '却下に失敗しました');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="loading"><p>読み込み中...</p></div>;
  }

  if (error || !article) {
    return <div className="error"><p>エラー: {error || '記事が見つかりません'}</p></div>;
  }

  return (
    <div className="review-detail">
      <div className="article-info">
        <h2>{article.title}</h2>
        <div className="meta">
          <span>ユーザー: {article.userId}</span>
          <span>カテゴリ: {article.category || 'なし'}</span>
          <span>作成日: {new Date(article.createdAt).toLocaleDateString('ja-JP')}</span>
        </div>
      </div>

      <div className="article-preview">
        <h3>プレビュー</h3>
        <div
          className="preview-content"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </div>

      <div className="review-actions">
        <div className="approve-section">
          <button
            onClick={handleApprove}
            disabled={submitting}
            className="btn-approve"
          >
            {submitting ? '処理中...' : '承認する'}
          </button>
        </div>

        <div className="reject-section">
          <label htmlFor="rejectionReason">却下理由</label>
          <textarea
            id="rejectionReason"
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            placeholder="却下する理由を入力してください"
            rows={4}
          />
          <button
            onClick={handleReject}
            disabled={submitting}
            className="btn-reject"
          >
            {submitting ? '処理中...' : '却下する'}
          </button>
        </div>
      </div>
    </div>
  );
}
