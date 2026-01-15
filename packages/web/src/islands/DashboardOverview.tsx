import type { Article } from '@maronn-auth-blog/shared';

interface DashboardOverviewProps {
  articles: Article[];
}

interface Stats {
  totalArticles: number;
  publishedArticles: number;
  pendingArticles: number;
  rejectedArticles: number;
}

export default function DashboardOverview({ articles }: DashboardOverviewProps) {
  const stats: Stats = {
    totalArticles: articles.length,
    publishedArticles: articles.filter((a) => a.status === 'published').length,
    pendingArticles: articles.filter((a) =>
      a.status === 'pending_new' || a.status === 'pending_update'
    ).length,
    rejectedArticles: articles.filter((a) => a.status === 'rejected').length,
  };

  return (
    <div className="dashboard-overview">
      <div className="stats-grid">
        <div className="stat-card">
          <h3>全記事</h3>
          <p className="stat-value">{stats.totalArticles}</p>
        </div>
        <div className="stat-card published">
          <h3>公開済み</h3>
          <p className="stat-value">{stats.publishedArticles}</p>
        </div>
        <div className="stat-card pending">
          <h3>審査待ち</h3>
          <p className="stat-value">{stats.pendingArticles}</p>
        </div>
        <div className="stat-card rejected">
          <h3>却下</h3>
          <p className="stat-value">{stats.rejectedArticles}</p>
        </div>
      </div>

      <div className="quick-actions">
        <h2>クイックアクション</h2>
        <div className="actions-grid">
          <a href="/dashboard/articles" className="action-card">
            <h3>記事を管理</h3>
            <p>記事の一覧を表示・管理します</p>
          </a>
          <a href="/dashboard/settings" className="action-card">
            <h3>設定</h3>
            <p>プロフィールやリポジトリの設定</p>
          </a>
        </div>
      </div>
    </div>
  );
}
