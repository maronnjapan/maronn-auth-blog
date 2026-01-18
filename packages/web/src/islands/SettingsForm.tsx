import { useState } from 'react';
import AvatarUploader from './AvatarUploader';
import RepositorySelector from './RepositorySelector';

interface InstallationRepository {
  id: number;
  name: string;
  fullName: string;
  owner: string;
  description: string | null;
  isPrivate: boolean;
  defaultBranch: string;
  htmlUrl: string;
  pushedAt: string | null;
}

interface SettingsFormProps {
  user: {
    id: string;
    username: string;
    displayName: string;
    iconUrl?: string;
    bio?: string;
    githubUrl?: string;
    twitterUrl?: string;
    websiteUrl?: string;
  };
  repository: {
    id: string;
    githubRepoFullName: string;
  } | null;
  apiUrl: string;
  githubAppInstallUrl?: string;
  initialMessage?: { type: 'success' | 'error'; text: string } | null;
  availableRepositories?: InstallationRepository[];
}

export default function SettingsForm({
  user,
  repository: initialRepository,
  apiUrl,
  githubAppInstallUrl,
  initialMessage = null,
  availableRepositories = [],
}: SettingsFormProps) {
  const [displayName, setDisplayName] = useState(user.displayName || '');
  const [bio, setBio] = useState(user.bio || '');
  const [githubUrl, setGithubUrl] = useState(user.githubUrl || '');
  const [twitterUrl, setTwitterUrl] = useState(user.twitterUrl || '');
  const [websiteUrl, setWebsiteUrl] = useState(user.websiteUrl || '');
  const [avatarUrl, setAvatarUrl] = useState(user.iconUrl || '');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(initialMessage);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const response = await fetch(`${apiUrl}/users/me`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ displayName, bio, githubUrl, twitterUrl, websiteUrl }),
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

  const handleAvatarUploadComplete = (newUrl: string) => {
    setAvatarUrl(newUrl);
  };

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
            <label>プロフィール画像</label>
            <AvatarUploader
              currentAvatarUrl={avatarUrl}
              displayName={displayName || user.displayName}
              apiUrl={apiUrl}
              onUploadComplete={handleAvatarUploadComplete}
            />
          </div>

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

          <div className="form-group">
            <label htmlFor="githubUrl">GitHub URL</label>
            <input
              type="url"
              id="githubUrl"
              value={githubUrl}
              onChange={(e) => setGithubUrl(e.target.value)}
              placeholder="https://github.com/username"
            />
          </div>

          <div className="form-group">
            <label htmlFor="twitterUrl">Twitter/X URL</label>
            <input
              type="url"
              id="twitterUrl"
              value={twitterUrl}
              onChange={(e) => setTwitterUrl(e.target.value)}
              placeholder="https://twitter.com/username"
            />
          </div>

          <div className="form-group">
            <label htmlFor="websiteUrl">ウェブサイト URL</label>
            <input
              type="url"
              id="websiteUrl"
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
              placeholder="https://example.com"
            />
          </div>

          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? '保存中...' : 'プロフィールを保存'}
          </button>
        </form>
      </section>

      <section className="settings-section">
        <h2>リポジトリ連携</h2>
        <RepositorySelector
          apiUrl={apiUrl}
          currentRepository={initialRepository}
          availableRepositories={availableRepositories}
          githubAppInstallUrl={githubAppInstallUrl}
        />
      </section>
    </div>
  );
}
