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

  const handleToggle = async () => {
    if (!isLoggedIn) {
      window.location.href = `${apiUrl}/auth/login`;
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
  );
}
