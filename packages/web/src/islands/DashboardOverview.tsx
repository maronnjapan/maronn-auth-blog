import { useEffect, useState } from 'react';

interface DashboardOverviewProps {
  apiUrl: string;
}

interface Stats {
  totalArticles: number;
  publishedArticles: number;
  pendingArticles: number;
  rejectedArticles: number;
}

export default function DashboardOverview({ apiUrl }: DashboardOverviewProps) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch(`${apiUrl}/dashboard/articles`, {
          credentials: 'include',
        });

        if (!response.ok) {
          throw new Error('統計情報の取得に失敗しました');
        }

        const data = await response.json();
        const articles = data.articles || [];

        const stats: Stats = {
          totalArticles: articles.length,
          publishedArticles: articles.filter((a: any) => a.status === 'published').length,
          pendingArticles: articles.filter((a: any) =>
            a.status === 'pending_new' || a.status === 'pending_update'
          ).length,
          rejectedArticles: articles.filter((a: any) => a.status === 'rejected').length,
        };

        setStats(stats);
      } catch (err) {
        setError(err instanceof Error ? err.message : '不明なエラー');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [apiUrl]);

  if (loading) {
    return <div className="loading"><p>読み込み中...</p></div>;
  }

  if (error) {
    return <div className="error"><p>エラー: {error}</p></div>;
  }

  if (!stats) {
    return null;
  }

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
