import { useState, useCallback } from 'react';

interface FollowButtonProps {
  targetUserId: string;
  initialIsFollowing: boolean;
  initialFollowerCount: number;
  apiUrl: string;
  isLoggedIn: boolean;
  loginUrl: string;
}

export default function FollowButton({
  targetUserId,
  initialIsFollowing,
  initialFollowerCount,
  apiUrl,
  isLoggedIn,
  loginUrl,
}: FollowButtonProps) {
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing);
  const [followerCount, setFollowerCount] = useState(initialFollowerCount);
  const [loading, setLoading] = useState(false);

  const handleToggleFollow = useCallback(async () => {
    if (!isLoggedIn) {
      window.location.href = loginUrl;
      return;
    }

    setLoading(true);
    try {
      if (isFollowing) {
        const response = await fetch(`${apiUrl}/follows/${targetUserId}`, {
          method: 'DELETE',
          credentials: 'include',
        });

        if (response.ok) {
          setIsFollowing(false);
          setFollowerCount((prev) => Math.max(0, prev - 1));
        } else {
          const data = await response.json().catch(() => null);
          alert(data?.error?.message || 'フォロー解除に失敗しました');
        }
      } else {
        const response = await fetch(`${apiUrl}/follows/${targetUserId}`, {
          method: 'POST',
          credentials: 'include',
        });

        if (response.ok) {
          setIsFollowing(true);
          setFollowerCount((prev) => prev + 1);
        } else {
          const data = await response.json().catch(() => null);
          alert(data?.error?.message || 'フォローに失敗しました');
        }
      }
    } catch {
      alert('通信エラーが発生しました');
    } finally {
      setLoading(false);
    }
  }, [isFollowing, targetUserId, apiUrl, isLoggedIn, loginUrl]);

  return (
    <div className="follow-container">
      <button
        onClick={handleToggleFollow}
        disabled={loading}
        className={`follow-btn ${isFollowing ? 'following' : ''}`}
      >
        {loading
          ? '処理中...'
          : isFollowing
            ? 'フォロー中'
            : 'フォローする'}
      </button>
      <span className="follower-count">
        {followerCount} フォロワー
      </span>

      <style>{`
        .follow-container {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .follow-btn {
          padding: 0.5rem 1.25rem;
          border: 1px solid #0066cc;
          border-radius: 20px;
          background: #0066cc;
          color: white;
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          min-width: 110px;
        }

        .follow-btn:hover:not(:disabled) {
          background: #0052a3;
          border-color: #0052a3;
        }

        .follow-btn.following {
          background: white;
          color: #333;
          border-color: #e0e0e0;
        }

        .follow-btn.following:hover:not(:disabled) {
          background: #fee2e2;
          border-color: #fca5a5;
          color: #dc2626;
        }

        .follow-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .follower-count {
          font-size: 0.875rem;
          color: #666;
        }

        @media (max-width: 480px) {
          .follow-btn {
            padding: 0.4rem 1rem;
            font-size: 0.8125rem;
            min-width: 96px;
          }

          .follower-count {
            font-size: 0.8125rem;
          }
        }
      `}</style>
    </div>
  );
}
