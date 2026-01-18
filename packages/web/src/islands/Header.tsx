import { useState } from 'react';
import NotificationBell from './NotificationBell';

interface User {
  id: string;
  username: string;
  displayName: string;
  iconUrl?: string;
  role: string;
}

interface HeaderProps {
  user: User | null;
  apiUrl: string;
  unreadCount?: number;
}

export default function Header({ user: initialUser, apiUrl, unreadCount = 0 }: HeaderProps) {
  const [user, setUser] = useState<User | null>(initialUser);
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    if (!confirm('ログアウトしますか？')) {
      return;
    }

    setLoggingOut(true);
    try {
      const response = await fetch(`${apiUrl}/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });

      if (response.ok) {
        setUser(null);
        window.location.href = '/';
      } else {
        alert('ログアウトに失敗しました');
      }
    } catch (err) {
      alert('ログアウトに失敗しました');
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <header className="header">
      <div className="container">
        <nav className="nav">
          <a href="/" className="logo">
            GitHub Blog
          </a>
          <div className="nav-links">
            <a href="/">フィード</a>
            <a href="/articles/search">検索</a>
            {user ? (
              <>
                <a href="/dashboard">ダッシュボード</a>
                {user.role === 'admin' && <a href="/admin/reviews">審査</a>}
                <NotificationBell initialCount={unreadCount} apiUrl={apiUrl} />
                <a href={`/${user.username}`} className="user-link">
                  {user.iconUrl && (
                    <img src={user.iconUrl} alt={user.displayName} className="user-avatar" />
                  )}
                  <span>{user.displayName}</span>
                </a>
                <button onClick={handleLogout} disabled={loggingOut} className="btn-secondary">
                  {loggingOut ? 'ログアウト中...' : 'ログアウト'}
                </button>
              </>
            ) : (
              <a href={`${apiUrl}/auth/login`} className="btn-primary">
                ログイン
              </a>
            )}
          </div>
        </nav>
      </div>

      <style>{`
        .header {
          background: white;
          border-bottom: 1px solid #e0e0e0;
          padding: 1rem 0;
        }

        .container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 1rem;
        }

        .nav {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .logo {
          font-size: 1.5rem;
          font-weight: bold;
          color: #333;
          text-decoration: none;
        }

        .nav-links {
          display: flex;
          gap: 1.5rem;
          align-items: center;
        }

        .nav-links a {
          color: #666;
          text-decoration: none;
          transition: color 0.2s;
        }

        .nav-links a:hover {
          color: #333;
        }

        .user-link {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
          transition: background 0.2s;
        }

        .user-link:hover {
          background: #f5f5f5;
        }

        .user-avatar {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          object-fit: cover;
        }

        .btn-primary {
          background: #0066cc;
          color: white !important;
          padding: 0.5rem 1rem;
          border-radius: 4px;
          font-weight: 500;
          border: none;
          cursor: pointer;
          text-decoration: none;
          display: inline-block;
        }

        .btn-primary:hover {
          background: #0052a3;
        }

        .btn-secondary {
          background: white;
          color: #666;
          padding: 0.5rem 1rem;
          border: 1px solid #e0e0e0;
          border-radius: 4px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-secondary:hover {
          background: #f5f5f5;
          border-color: #ccc;
        }

        .btn-secondary:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
      `}</style>
    </header>
  );
}
