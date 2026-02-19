import { useState, useCallback } from 'react';

interface Notification {
  id: string;
  userId: string;
  type: 'article_approved' | 'article_rejected' | 'article_update_detected' | 'new_article_from_followed';
  articleId?: string;
  message: string;
  readAt?: string;
  createdAt: string;
}

interface NotificationListProps {
  notifications: Notification[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
  apiUrl: string;
}

export default function NotificationList({
  notifications: initialNotifications,
  total,
  page,
  limit,
  hasMore,
  apiUrl,
}: NotificationListProps) {
  const [notifications, setNotifications] = useState(initialNotifications);
  const [markingAllRead, setMarkingAllRead] = useState(false);

  const handleMarkRead = useCallback(async (id: string) => {
    try {
      const response = await fetch(`${apiUrl}/dashboard/notifications/${id}/read`, {
        method: 'POST',
        credentials: 'include',
      });

      if (response.ok) {
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === id ? { ...n, readAt: new Date().toISOString() } : n
          )
        );
      }
    } catch {
      alert('通知の既読処理に失敗しました');
    }
  }, [apiUrl]);

  const handleMarkAllRead = useCallback(async () => {
    if (!confirm('すべての通知を既読にしますか？')) {
      return;
    }

    setMarkingAllRead(true);
    try {
      const response = await fetch(`${apiUrl}/dashboard/notifications/read-all`, {
        method: 'POST',
        credentials: 'include',
      });

      if (response.ok) {
        setNotifications((prev) =>
          prev.map((n) => ({ ...n, readAt: n.readAt || new Date().toISOString() }))
        );
      }
    } catch {
      alert('既読処理に失敗しました');
    } finally {
      setMarkingAllRead(false);
    }
  }, [apiUrl]);

  const getTypeIcon = (type: Notification['type']) => {
    switch (type) {
      case 'article_approved':
        return '✓';
      case 'article_rejected':
        return '✕';
      case 'article_update_detected':
        return '↻';
      case 'new_article_from_followed':
        return '★';
    }
  };

  const getTypeClass = (type: Notification['type']) => {
    switch (type) {
      case 'article_approved':
        return 'approved';
      case 'article_rejected':
        return 'rejected';
      case 'article_update_detected':
        return 'update';
      case 'new_article_from_followed':
        return 'new-article';
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'たった今';
    if (diffMins < 60) return `${diffMins}分前`;
    if (diffHours < 24) return `${diffHours}時間前`;
    if (diffDays < 7) return `${diffDays}日前`;
    return date.toLocaleDateString('ja-JP');
  };

  const unreadCount = notifications.filter((n) => !n.readAt).length;

  if (notifications.length === 0) {
    return (
      <div className="notification-list empty">
        <p>通知はありません</p>
        <style>{`
          .notification-list.empty {
            text-align: center;
            padding: 3rem;
            color: #999;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="notification-list">
      {unreadCount > 0 && (
        <div className="actions">
          <button
            onClick={handleMarkAllRead}
            disabled={markingAllRead}
            className="btn-mark-all"
          >
            {markingAllRead ? '処理中...' : 'すべて既読にする'}
          </button>
        </div>
      )}

      <ul>
        {notifications.map((notification) => (
          <li
            key={notification.id}
            className={`notification-item ${notification.readAt ? 'read' : 'unread'}`}
            onClick={() => !notification.readAt && handleMarkRead(notification.id)}
          >
            <span className={`icon ${getTypeClass(notification.type)}`}>
              {getTypeIcon(notification.type)}
            </span>
            <div className="content">
              <p className="message">{notification.message}</p>
              <span className="time">{formatDate(notification.createdAt)}</span>
            </div>
            {!notification.readAt && <span className="unread-dot" />}
          </li>
        ))}
      </ul>

      {(page > 1 || hasMore) && (
        <div className="pagination">
          {page > 1 && (
            <a href={`/dashboard/notifications?page=${page - 1}`} className="page-link">
              前へ
            </a>
          )}
          <span className="page-info">
            {page} / {Math.ceil(total / limit)}
          </span>
          {hasMore && (
            <a href={`/dashboard/notifications?page=${page + 1}`} className="page-link">
              次へ
            </a>
          )}
        </div>
      )}

      <style>{`
        .notification-list {
          background: white;
          border-radius: 8px;
          overflow: hidden;
        }

        .actions {
          padding: 1rem;
          border-bottom: 1px solid #e0e0e0;
          text-align: right;
        }

        .btn-mark-all {
          padding: 0.5rem 1rem;
          background: white;
          border: 1px solid #e0e0e0;
          border-radius: 4px;
          color: #666;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-mark-all:hover:not(:disabled) {
          background: #f5f5f5;
          border-color: #ccc;
        }

        .btn-mark-all:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        ul {
          list-style: none;
          margin: 0;
          padding: 0;
        }

        .notification-item {
          display: flex;
          align-items: flex-start;
          gap: 1rem;
          padding: 1rem;
          border-bottom: 1px solid #f0f0f0;
          cursor: pointer;
          transition: background 0.2s;
        }

        .notification-item:last-child {
          border-bottom: none;
        }

        .notification-item:hover {
          background: #fafafa;
        }

        .notification-item.read {
          opacity: 0.7;
          cursor: default;
        }

        .notification-item.unread {
          background: #f8f9ff;
        }

        .icon {
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          font-size: 1rem;
          flex-shrink: 0;
        }

        .icon.approved {
          background: #e8f5e9;
          color: #2e7d32;
        }

        .icon.rejected {
          background: #ffebee;
          color: #c62828;
        }

        .icon.update {
          background: #e3f2fd;
          color: #1565c0;
        }

        .icon.new-article {
          background: #fff3e0;
          color: #e65100;
        }

        .content {
          flex: 1;
          min-width: 0;
        }

        .message {
          margin: 0;
          color: #333;
          line-height: 1.4;
        }

        .time {
          font-size: 0.875rem;
          color: #999;
        }

        .unread-dot {
          width: 8px;
          height: 8px;
          background: #0066cc;
          border-radius: 50%;
          flex-shrink: 0;
          margin-top: 0.5rem;
        }

        .pagination {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 1rem;
          padding: 1rem;
          border-top: 1px solid #e0e0e0;
        }

        .page-link {
          padding: 0.5rem 1rem;
          border: 1px solid #e0e0e0;
          border-radius: 4px;
          text-decoration: none;
          color: #666;
          transition: all 0.2s;
        }

        .page-link:hover {
          border-color: #0066cc;
          color: #0066cc;
        }

        .page-info {
          color: #999;
        }
      `}</style>
    </div>
  );
}
