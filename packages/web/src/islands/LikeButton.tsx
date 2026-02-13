import { useState } from 'react';

interface LikeButtonProps {
  articleId: string;
  initialLiked: boolean;
  initialCount: number;
  apiUrl: string;
  isLoggedIn: boolean;
  size?: 'small' | 'medium';
}

export default function LikeButton({
  articleId,
  initialLiked,
  initialCount,
  apiUrl,
  isLoggedIn,
  size = 'medium',
}: LikeButtonProps) {
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount);
  const [loading, setLoading] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);

  const handleToggle = async () => {
    if (!isLoggedIn) {
      setShowLoginModal(true);
      return;
    }

    if (loading) return;
    setLoading(true);

    try {
      const method = liked ? 'DELETE' : 'POST';
      const response = await fetch(`${apiUrl}/likes/${articleId}`, {
        method,
        credentials: 'include',
      });

      if (response.ok) {
        setLiked(!liked);
        setCount((prev) => (liked ? prev - 1 : prev + 1));
      }
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  };

  const iconSize = size === 'small' ? 16 : 20;
  const className = `like-btn like-btn-${size} ${liked ? 'liked' : ''}`;

  return (
    <>
      <button
        className={className}
        onClick={handleToggle}
        disabled={loading}
        title={liked ? 'いいね解除' : 'いいね'}
        aria-label={liked ? 'いいね解除' : 'いいね'}
      >
        <svg
          viewBox="0 0 24 24"
          width={iconSize}
          height={iconSize}
          fill={liked ? 'currentColor' : 'none'}
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
        </svg>
        {count > 0 && <span className="like-count">{count}</span>}
      </button>

      {showLoginModal && (
        <div
          className="login-modal-overlay"
          onClick={() => setShowLoginModal(false)}
        >
          <div
            className="login-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="login-modal-close"
              onClick={() => setShowLoginModal(false)}
              aria-label="閉じる"
            >
              &times;
            </button>
            <div className="login-modal-icon">
              <svg viewBox="0 0 24 24" width={32} height={32} fill="none" stroke="#ef4444" strokeWidth="2">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
            </div>
            <h3 className="login-modal-title">ログインが必要です</h3>
            <p className="login-modal-message">
              いいね機能を利用するにはログインしてください。
            </p>
            <a
              href={`${apiUrl}/auth/login`}
              className="login-modal-btn"
            >
              ログインする
            </a>
          </div>
        </div>
      )}

      <style>{`
        .like-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          border: 1px solid #ddd;
          border-radius: 999px;
          background: white;
          color: #999;
          cursor: pointer;
          transition: all 0.2s;
          font-size: 0.85rem;
          font-weight: 500;
        }
        .like-btn-medium {
          padding: 0.4rem 0.75rem;
          height: 40px;
        }
        .like-btn-small {
          padding: 0.25rem 0.5rem;
          height: 32px;
          font-size: 0.8rem;
        }
        .like-btn:hover {
          border-color: #ef4444;
          color: #ef4444;
        }
        .like-btn.liked {
          background: #fef2f2;
          border-color: #ef4444;
          color: #ef4444;
        }
        .like-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .like-count {
          font-variant-numeric: tabular-nums;
        }
        .login-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10000;
          animation: fadeIn 0.15s ease;
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .login-modal {
          background: white;
          border-radius: 12px;
          padding: 2rem;
          max-width: 400px;
          width: 90%;
          text-align: center;
          position: relative;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
          animation: slideUp 0.2s ease;
        }
        @keyframes slideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .login-modal-close {
          position: absolute;
          top: 0.75rem;
          right: 0.75rem;
          background: none;
          border: none;
          font-size: 1.5rem;
          color: #999;
          cursor: pointer;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          transition: background 0.2s, color 0.2s;
        }
        .login-modal-close:hover {
          background: #f5f5f5;
          color: #333;
        }
        .login-modal-icon {
          margin-bottom: 1rem;
        }
        .login-modal-title {
          font-size: 1.25rem;
          font-weight: 600;
          color: #1a1a2e;
          margin-bottom: 0.5rem;
        }
        .login-modal-message {
          font-size: 0.9rem;
          color: #666;
          margin-bottom: 1.5rem;
          line-height: 1.5;
        }
        .login-modal-btn {
          display: inline-block;
          background: #ef4444;
          color: white;
          padding: 0.75rem 2rem;
          border-radius: 8px;
          font-size: 1rem;
          font-weight: 500;
          text-decoration: none;
          transition: background 0.2s;
        }
        .login-modal-btn:hover {
          background: #dc2626;
        }
      `}</style>
    </>
  );
}
