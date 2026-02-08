import { useState, useCallback } from 'react';

interface NotificationBellProps {
  initialCount: number;
  apiUrl: string;
}

export default function NotificationBell({ initialCount, apiUrl }: NotificationBellProps) {
  const [count, setCount] = useState(initialCount);

  const refreshCount = useCallback(async () => {
    try {
      const response = await fetch(`${apiUrl}/dashboard/notifications/unread-count`, {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setCount(data.count);
      }
    } catch {
      // Ignore errors
    }
  }, [apiUrl]);

  return (
    <a href="/dashboard/notifications" className="notification-bell" title="通知">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </svg>
      {count > 0 && (
        <span className="badge">{count > 99 ? '99+' : count}</span>
      )}

      <style>{`
        .notification-bell {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 40px;
          height: 40px;
          color: #666;
          text-decoration: none;
          transition: color 0.2s;
        }

        .notification-bell:hover {
          color: #333;
        }

        .notification-bell svg {
          flex-shrink: 0;
        }

        .badge {
          position: absolute;
          top: 2px;
          right: 2px;
          min-width: 18px;
          height: 18px;
          padding: 0 4px;
          background: #e53935;
          color: white;
          font-size: 11px;
          font-weight: bold;
          border-radius: 9px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        @media (max-width: 768px) {
          .badge {
            position: static;
            margin-left: auto;
          }
        }
      `}</style>
    </a>
  );
}
