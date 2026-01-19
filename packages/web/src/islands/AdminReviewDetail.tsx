import { useState } from 'react';

interface AdminReviewDetailProps {
  articleId: string;
  apiUrl: string;
}

export default function AdminReviewDetail({ articleId, apiUrl }: AdminReviewDetailProps) {
  const [submitting, setSubmitting] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

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

  return (
    <div className="review-actions">
      <div className="approve-section">
        <button onClick={handleApprove} disabled={submitting} className="btn-approve">
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
        <button onClick={handleReject} disabled={submitting} className="btn-reject">
          {submitting ? '処理中...' : '却下する'}
        </button>
      </div>
    </div>
  );
}
