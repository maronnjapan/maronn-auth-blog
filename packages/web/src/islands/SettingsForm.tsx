import { useEffect, useState } from 'react';

interface SettingsFormProps {
  apiUrl: string;
}

interface User {
  id: string;
  username: string;
  displayName: string;
  iconUrl?: string;
  bio?: string;
}

interface Repository {
  id: string;
  githubRepoFullName: string;
}

export default function SettingsForm({ apiUrl }: SettingsFormProps) {
  const [user, setUser] = useState<User | null>(null);
  const [repository, setRepository] = useState<Repository | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [repoFullName, setRepoFullName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [userRes, repoRes] = await Promise.all([
          fetch(`${apiUrl}/auth/me`, { credentials: 'include' }),
          fetch(`${apiUrl}/users/me/repository`, { credentials: 'include' }),
        ]);

        if (userRes.ok) {
          const userData = await userRes.json();
          setUser(userData);
          setDisplayName(userData.displayName || '');
          setBio(userData.bio || '');
        }

        if (repoRes.ok) {
          const repoData = await repoRes.json();
          if (repoData) {
            setRepository(repoData);
            setRepoFullName(repoData.githubRepoFullName || '');
          }
        }
      } catch (err) {
        setMessage({ type: 'error', text: 'データの取得に失敗しました' });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [apiUrl]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const response = await fetch(`${apiUrl}/users/me`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ displayName, bio }),
      });

      if (!response.ok) {
        throw new Error('プロフィールの更新に失敗しました');
      }

      setMessage({ type: 'success', text: 'プロフィールを更新しました' });
    } catch (err) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : '更新に失敗しました',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveRepository = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const response = await fetch(`${apiUrl}/users/me/repository`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ githubRepoFullName: repoFullName }),
      });

      if (!response.ok) {
        throw new Error('リポジトリの更新に失敗しました');
      }

      setMessage({ type: 'success', text: 'リポジトリを更新しました' });
    } catch (err) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : '更新に失敗しました',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleUnlinkRepository = async () => {
    if (!confirm('リポジトリの連携を解除しますか？')) {
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      const response = await fetch(`${apiUrl}/users/me/repository`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('連携解除に失敗しました');
      }

      setRepository(null);
      setRepoFullName('');
      setMessage({ type: 'success', text: '連携を解除しました' });
    } catch (err) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : '連携解除に失敗しました',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="loading"><p>読み込み中...</p></div>;
  }

  return (
    <div className="settings-container">
      {message && (
        <div className={`message ${message.type}`}>
          {message.text}
        </div>
      )}

      <section className="settings-section">
        <h2>プロフィール</h2>
        <form onSubmit={handleSaveProfile}>
          <div className="form-group">
            <label htmlFor="displayName">表示名</label>
            <input
              type="text"
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="bio">自己紹介</label>
            <textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={4}
            />
          </div>

          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? '保存中...' : 'プロフィールを保存'}
          </button>
        </form>
      </section>

      <section className="settings-section">
        <h2>リポジトリ連携</h2>
        <form onSubmit={handleSaveRepository}>
          <div className="form-group">
            <label htmlFor="repoFullName">リポジトリ (例: username/repo-name)</label>
            <input
              type="text"
              id="repoFullName"
              value={repoFullName}
              onChange={(e) => setRepoFullName(e.target.value)}
              placeholder="username/repository"
              required
            />
          </div>

          <div className="button-group">
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? '保存中...' : 'リポジトリを保存'}
            </button>
            {repository && (
              <button
                type="button"
                onClick={handleUnlinkRepository}
                disabled={saving}
                className="btn-danger"
              >
                連携を解除
              </button>
            )}
          </div>
        </form>
      </section>
    </div>
  );
}
