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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
  };

  return (
    <header className="header">
      <div className="container">
        <nav className="nav">
          <a href="/" className="logo">
            Auth Vault
          </a>

          <button
            className="mobile-menu-button"
            onClick={toggleMobileMenu}
            aria-label="メニューを開く"
          >
            <span className={`hamburger ${mobileMenuOpen ? 'open' : ''}`}>
              <span></span>
              <span></span>
              <span></span>
            </span>
          </button>

          <div className={`nav-links ${mobileMenuOpen ? 'mobile-open' : ''}`}>
            <a href="/" onClick={closeMobileMenu}>フィード</a>
            <a href="/articles/search" onClick={closeMobileMenu}>検索</a>
            {user ? (
              <>
                <a href="/dashboard" onClick={closeMobileMenu}>ダッシュボード</a>
                {user.role === 'admin' && <a href="/admin/reviews" onClick={closeMobileMenu}>審査</a>}
                <div className="notification-wrapper">
                  <NotificationBell initialCount={unreadCount} apiUrl={apiUrl} />
                </div>
                <a href={`/${user.username}`} className="user-link" onClick={closeMobileMenu}>
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
          position: relative;
        }

        .logo {
          font-size: 1.5rem;
          font-weight: bold;
          color: #333;
          text-decoration: none;
          z-index: 1001;
        }

        .mobile-menu-button {
          display: none;
          background: none;
          border: none;
          cursor: pointer;
          padding: 0.5rem;
          z-index: 1001;
        }

        .hamburger {
          display: flex;
          flex-direction: column;
          gap: 4px;
          width: 24px;
        }

        .hamburger span {
          display: block;
          width: 100%;
          height: 2px;
          background: #333;
          transition: all 0.3s;
        }

        .hamburger.open span:nth-child(1) {
          transform: rotate(45deg) translate(5px, 5px);
        }

        .hamburger.open span:nth-child(2) {
          opacity: 0;
        }

        .hamburger.open span:nth-child(3) {
          transform: rotate(-45deg) translate(6px, -6px);
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
          white-space: nowrap;
        }

        .nav-links a:hover {
          color: #333;
        }

        .notification-wrapper {
          display: flex;
          align-items: center;
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

        /* Mobile Responsive Styles */
        @media (max-width: 768px) {
          .logo {
            font-size: 1.25rem;
          }

          .mobile-menu-button {
            display: block;
          }

          .nav-links {
            position: fixed;
            top: 0;
            right: -100%;
            width: 80%;
            max-width: 300px;
            height: 100vh;
            background: white;
            flex-direction: column;
            align-items: flex-start;
            padding: 5rem 2rem 2rem;
            gap: 1rem;
            box-shadow: -2px 0 10px rgba(0, 0, 0, 0.1);
            transition: right 0.3s ease;
            overflow-y: auto;
            z-index: 1000;
          }

          .nav-links.mobile-open {
            right: 0;
          }

          .nav-links a,
          .nav-links .notification-wrapper,
          .nav-links .user-link,
          .nav-links button {
            width: 100%;
            padding: 0.75rem 1rem;
            text-align: left;
            justify-content: flex-start;
          }

          .nav-links a {
            border-bottom: 1px solid #f0f0f0;
          }

          .user-link {
            border: 1px solid #e0e0e0;
            border-radius: 8px;
          }

          .btn-primary,
          .btn-secondary {
            width: 100%;
            text-align: center;
            justify-content: center;
          }
        }

        @media (max-width: 480px) {
          .logo {
            font-size: 1.1rem;
          }

          .container {
            padding: 0 0.75rem;
          }

          .nav-links {
            width: 85%;
            padding: 4rem 1.5rem 1.5rem;
          }

          .user-avatar {
            width: 28px;
            height: 28px;
          }
        }
      `}</style>
    </header>
  );
}
