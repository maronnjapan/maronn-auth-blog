import { useState } from 'react';
import type { Article } from '@maronn-auth-blog/shared';

interface AdminReviewDetailProps {
  article: Article;
  html: string;
  apiUrl: string;
}

export default function AdminReviewDetail({ article, html, apiUrl }: AdminReviewDetailProps) {
  const [submitting, setSubmitting] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  const handleApprove = async () => {
    if (!confirm('この記事を承認しますか？')) {
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`${apiUrl}/admin/reviews/${article.id}/approve`, {
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
      const response = await fetch(`${apiUrl}/admin/reviews/${article.id}/reject`, {
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
