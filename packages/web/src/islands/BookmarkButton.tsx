import { useState } from 'react';

interface BookmarkButtonProps {
  articleId: string;
  initialBookmarked: boolean;
  apiUrl: string;
  isLoggedIn: boolean;
  size?: 'small' | 'medium';
}

export default function BookmarkButton({
  articleId,
  initialBookmarked,
  apiUrl,
  isLoggedIn,
  size = 'medium',
}: BookmarkButtonProps) {
  const [bookmarked, setBookmarked] = useState(initialBookmarked);
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
      const method = bookmarked ? 'DELETE' : 'POST';
      const response = await fetch(`${apiUrl}/bookmarks/${articleId}`, {
        method,
        credentials: 'include',
      });

      if (response.ok) {
        setBookmarked(!bookmarked);
      }
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  };

  const iconSize = size === 'small' ? 16 : 20;
  const className = `bookmark-btn bookmark-btn-${size} ${bookmarked ? 'bookmarked' : ''}`;

  return (
    <>
      <button
        className={className}
        onClick={handleToggle}
        disabled={loading}
        title={bookmarked ? 'ブックマーク解除' : 'ブックマークに追加'}
        aria-label={bookmarked ? 'ブックマーク解除' : 'ブックマークに追加'}
      >
        <svg
          viewBox="0 0 24 24"
          width={iconSize}
          height={iconSize}
          fill={bookmarked ? 'currentColor' : 'none'}
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
        </svg>
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
              <svg viewBox="0 0 24 24" width={32} height={32} fill="none" stroke="#6366f1" strokeWidth="2">
                <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <h3 className="login-modal-title">ログインが必要です</h3>
            <p className="login-modal-message">
              ブックマーク機能を利用するにはログインしてください。
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
          background: #6366f1;
          color: white;
          padding: 0.75rem 2rem;
          border-radius: 8px;
          font-size: 1rem;
          font-weight: 500;
          text-decoration: none;
          transition: background 0.2s;
        }
        .login-modal-btn:hover {
          background: #4f46e5;
        }
      `}</style>
    </>
  );
}
