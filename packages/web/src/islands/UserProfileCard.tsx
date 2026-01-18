interface UserStats {
  totalArticles: number;
  publishedArticles: number;
  pendingArticles: number;
  rejectedArticles: number;
}

interface User {
  id: string;
  username: string;
  displayName: string;
  iconUrl?: string;
  bio?: string;
  githubUrl?: string;
  twitterUrl?: string;
  websiteUrl?: string;
  createdAt: string;
}

interface UserProfileCardProps {
  user: User;
  stats: UserStats;
  isOwner?: boolean;
}

export default function UserProfileCard({ user, stats, isOwner }: UserProfileCardProps) {
  return (
    <div className="profile-card">
      <div className="profile-header">
        {user.iconUrl ? (
          <img src={user.iconUrl} alt={user.displayName} className="avatar" />
        ) : (
          <div className="avatar-placeholder">
            {user.displayName.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="profile-info">
          <h1 className="display-name">{user.displayName}</h1>
          <p className="username">@{user.username}</p>
        </div>
        {isOwner && (
          <a href="/dashboard/settings" className="edit-btn">
            編集
          </a>
        )}
      </div>

      {user.bio && <p className="bio">{user.bio}</p>}

      <div className="stats">
        <div className="stat">
          <span className="stat-value">{stats.publishedArticles}</span>
          <span className="stat-label">公開記事</span>
        </div>
        {isOwner && (
          <>
            <div className="stat">
              <span className="stat-value">{stats.pendingArticles}</span>
              <span className="stat-label">審査中</span>
            </div>
            <div className="stat">
              <span className="stat-value">{stats.totalArticles}</span>
              <span className="stat-label">総記事</span>
            </div>
          </>
        )}
      </div>

      {(user.githubUrl || user.twitterUrl || user.websiteUrl) && (
        <div className="social-links">
          {user.githubUrl && (
            <a href={user.githubUrl} target="_blank" rel="noopener noreferrer" className="social-link" title="GitHub">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
              </svg>
            </a>
          )}
          {user.twitterUrl && (
            <a href={user.twitterUrl} target="_blank" rel="noopener noreferrer" className="social-link" title="Twitter/X">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
              </svg>
            </a>
          )}
          {user.websiteUrl && (
            <a href={user.websiteUrl} target="_blank" rel="noopener noreferrer" className="social-link" title="Website">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="2" y1="12" x2="22" y2="12"/>
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
              </svg>
            </a>
          )}
        </div>
      )}

      <p className="joined">
        参加日: {new Date(user.createdAt).toLocaleDateString('ja-JP')}
      </p>

      <style>{`
        .profile-card {
          background: white;
          border: 1px solid #e0e0e0;
          border-radius: 12px;
          padding: 1.5rem;
        }

        .profile-header {
          display: flex;
          align-items: flex-start;
          gap: 1rem;
          margin-bottom: 1rem;
        }

        .avatar {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          object-fit: cover;
        }

        .avatar-placeholder {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          background: #e0e0e0;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 2rem;
          font-weight: bold;
          color: #666;
        }

        .profile-info {
          flex: 1;
        }

        .display-name {
          margin: 0;
          font-size: 1.5rem;
          color: #333;
        }

        .username {
          margin: 0.25rem 0 0 0;
          color: #666;
        }

        .edit-btn {
          padding: 0.5rem 1rem;
          border: 1px solid #e0e0e0;
          border-radius: 4px;
          text-decoration: none;
          color: #666;
          font-size: 0.875rem;
          transition: all 0.2s;
        }

        .edit-btn:hover {
          background: #f5f5f5;
          border-color: #ccc;
        }

        .bio {
          color: #555;
          line-height: 1.6;
          margin: 1rem 0;
        }

        .stats {
          display: flex;
          gap: 2rem;
          padding: 1rem 0;
          border-top: 1px solid #f0f0f0;
          border-bottom: 1px solid #f0f0f0;
          margin: 1rem 0;
        }

        .stat {
          text-align: center;
        }

        .stat-value {
          display: block;
          font-size: 1.5rem;
          font-weight: bold;
          color: #333;
        }

        .stat-label {
          display: block;
          font-size: 0.875rem;
          color: #999;
        }

        .social-links {
          display: flex;
          gap: 0.75rem;
          margin: 1rem 0;
        }

        .social-link {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: #f5f5f5;
          color: #666;
          text-decoration: none;
          transition: all 0.2s;
        }

        .social-link:hover {
          background: #e0e0e0;
          color: #333;
        }

        .joined {
          margin: 0;
          font-size: 0.875rem;
          color: #999;
        }
      `}</style>
    </div>
  );
}
