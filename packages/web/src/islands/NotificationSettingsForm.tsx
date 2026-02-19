import { useState } from 'react';

interface NotificationSettingsFormProps {
  initialSettings: {
    emailNotifications: boolean;
  };
  apiUrl: string;
}

export default function NotificationSettingsForm({
  initialSettings,
  apiUrl,
}: NotificationSettingsFormProps) {
  const [emailNotifications, setEmailNotifications] = useState(
    initialSettings.emailNotifications
  );
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);

    try {
      const response = await fetch(`${apiUrl}/dashboard/notification-settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ emailNotifications }),
      });

      if (!response.ok) {
        throw new Error('通知設定の更新に失敗しました');
      }

      setMessage({ type: 'success', text: '通知設定を更新しました' });
    } catch (err) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : '更新に失敗しました',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="notification-settings">
      {message && (
        <div className={`settings-message ${message.type}`}>{message.text}</div>
      )}

      <div className="setting-item">
        <div className="setting-info">
          <label htmlFor="emailNotifications" className="setting-label">
            メール通知
          </label>
          <p className="setting-description">
            フォロー中の著者が新しい記事を公開したときにメールで通知を受け取ります。
          </p>
        </div>
        <label className="toggle">
          <input
            type="checkbox"
            id="emailNotifications"
            checked={emailNotifications}
            onChange={(e) => setEmailNotifications(e.target.checked)}
          />
          <span className="toggle-slider" />
        </label>
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="btn-save"
      >
        {saving ? '保存中...' : '設定を保存'}
      </button>

      <style>{`
        .notification-settings {
          background: white;
          border: 1px solid #e0e0e0;
          border-radius: 8px;
          padding: 1.5rem;
        }

        .settings-message {
          padding: 0.75rem 1rem;
          border-radius: 4px;
          margin-bottom: 1rem;
          font-size: 0.875rem;
        }

        .settings-message.success {
          background: #e8f5e9;
          color: #2e7d32;
        }

        .settings-message.error {
          background: #ffebee;
          color: #c62828;
        }

        .setting-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
          padding: 1rem 0;
          border-bottom: 1px solid #f0f0f0;
        }

        .setting-info {
          flex: 1;
        }

        .setting-label {
          font-weight: 500;
          color: #333;
          cursor: pointer;
        }

        .setting-description {
          margin: 0.25rem 0 0 0;
          font-size: 0.875rem;
          color: #666;
        }

        .toggle {
          position: relative;
          display: inline-block;
          width: 48px;
          height: 26px;
          flex-shrink: 0;
        }

        .toggle input {
          opacity: 0;
          width: 0;
          height: 0;
        }

        .toggle-slider {
          position: absolute;
          cursor: pointer;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: #ccc;
          transition: 0.3s;
          border-radius: 26px;
        }

        .toggle-slider:before {
          position: absolute;
          content: '';
          height: 20px;
          width: 20px;
          left: 3px;
          bottom: 3px;
          background-color: white;
          transition: 0.3s;
          border-radius: 50%;
        }

        .toggle input:checked + .toggle-slider {
          background-color: #0066cc;
        }

        .toggle input:checked + .toggle-slider:before {
          transform: translateX(22px);
        }

        .btn-save {
          margin-top: 1rem;
          padding: 0.5rem 1.5rem;
          background: #0066cc;
          color: white;
          border: none;
          border-radius: 4px;
          font-size: 0.875rem;
          cursor: pointer;
          transition: background 0.2s;
        }

        .btn-save:hover:not(:disabled) {
          background: #0052a3;
        }

        .btn-save:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}
