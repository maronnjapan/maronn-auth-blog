import { useState } from 'react';

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

interface ValidateRepositoryResponse {
  isValid: boolean;
  repository: InstallationRepository | null;
  errors: string[];
  warnings: string[];
}

interface RepositorySelectorProps {
  apiUrl: string;
  currentRepository: { id: string; githubRepoFullName: string } | null;
  availableRepositories: InstallationRepository[];
  githubAppInstallUrl?: string;
  onRepositoryLinked?: () => void;
}

type Step = 'select' | 'confirm' | 'complete';

export default function RepositorySelector({
  apiUrl,
  currentRepository,
  availableRepositories,
  githubAppInstallUrl,
  onRepositoryLinked,
}: RepositorySelectorProps) {
  const [step, setStep] = useState<Step>('select');
  const [selectedRepo, setSelectedRepo] = useState<InstallationRepository | null>(null);
  const [validationResult, setValidationResult] = useState<ValidateRepositoryResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [linkedRepository, setLinkedRepository] = useState(currentRepository);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '不明';
    return new Date(dateString).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const handleSelectRepository = async (repo: InstallationRepository) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${apiUrl}/users/me/repository/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ githubRepoFullName: repo.fullName }),
      });

      const result: ValidateRepositoryResponse = await response.json();

      if (result.isValid) {
        setSelectedRepo(repo);
        setValidationResult(result);
        setStep('confirm');
      } else {
        setError(result.errors.join('\n'));
      }
    } catch {
      setError('検証に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmLink = async () => {
    if (!selectedRepo) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${apiUrl}/users/me/repository`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ githubRepoFullName: selectedRepo.fullName }),
      });

      if (response.ok) {
        const data = await response.json();
        setLinkedRepository(data);
        setStep('complete');
        onRepositoryLinked?.();
      } else {
        throw new Error('連携に失敗しました');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '連携に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleUnlinkRepository = async () => {
    if (!confirm('リポジトリの連携を解除しますか？')) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${apiUrl}/users/me/repository`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (response.ok) {
        setLinkedRepository(null);
        setSelectedRepo(null);
        setStep('select');
      } else {
        throw new Error('連携解除に失敗しました');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '連携解除に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    setStep('select');
    setSelectedRepo(null);
    setValidationResult(null);
    setError(null);
  };

  const handleReset = () => {
    setStep('select');
    setSelectedRepo(null);
    setValidationResult(null);
    setError(null);
  };

  const hasAvailableRepositories = availableRepositories.length > 0;

  return (
    <div className="repository-selector">
      {error && <div className="error-message">{error}</div>}

      {/* 連携中のリポジトリ表示 */}
      {linkedRepository && step === 'select' && (
        <div className="linked-repository">
          <h4>連携中のリポジトリ</h4>
          <div className="linked-repo-info">
            <span className="repo-name">{linkedRepository.githubRepoFullName}</span>
            <button
              type="button"
              onClick={handleUnlinkRepository}
              disabled={loading}
              className="btn-danger"
            >
              連携を解除
            </button>
          </div>
        </div>
      )}

      {/* Step 1: リポジトリ選択 */}
      {step === 'select' && (
        <div className="step-select">
          <div className="app-install-box">
            <p>GitHub App をインストールして、リポジトリの読み取り権限を付与してください。</p>
            {githubAppInstallUrl ? (
              <a
                className="btn-secondary"
                href={githubAppInstallUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                GitHub App をインストール
              </a>
            ) : (
              <p className="note">GitHub App のインストール URL が設定されていません。</p>
            )}
          </div>

          {hasAvailableRepositories ? (
            <div className="repository-list">
              <h4>リポジトリを選択</h4>
              <div className="repo-cards">
                {availableRepositories.map((repo) => (
                  <div key={repo.id} className="repo-card">
                    <div className="repo-card-header">
                      <div className="repo-name-row">
                        <span className="repo-full-name">{repo.fullName}</span>
                        {repo.isPrivate ? (
                          <span className="badge badge-private">Private</span>
                        ) : (
                          <span className="badge badge-public">Public</span>
                        )}
                      </div>
                      {repo.description && (
                        <p className="repo-description">{repo.description}</p>
                      )}
                    </div>
                    <div className="repo-card-footer">
                      <span className="repo-meta">
                        最終更新: {formatDate(repo.pushedAt)}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleSelectRepository(repo)}
                        disabled={loading}
                        className="btn-primary"
                      >
                        選択
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="help-text">
              GitHub App をインストールすると、アクセス可能なリポジトリがここに表示されます。
            </p>
          )}
        </div>
      )}

      {/* Step 2: 確認画面 */}
      {step === 'confirm' && selectedRepo && (
        <div className="step-confirm">
          <h4>連携内容の確認</h4>
          <div className="confirm-card">
            <div className="confirm-header">
              <span className="repo-full-name">{selectedRepo.fullName}</span>
              {selectedRepo.isPrivate ? (
                <span className="badge badge-private">Private</span>
              ) : (
                <span className="badge badge-public">Public</span>
              )}
            </div>
            {selectedRepo.description && (
              <p className="repo-description">{selectedRepo.description}</p>
            )}
            <div className="confirm-details">
              <p><strong>オーナー:</strong> {selectedRepo.owner}</p>
              <p><strong>デフォルトブランチ:</strong> {selectedRepo.defaultBranch}</p>
              <p><strong>最終更新:</strong> {formatDate(selectedRepo.pushedAt)}</p>
            </div>

            {validationResult?.warnings && validationResult.warnings.length > 0 && (
              <div className="warnings">
                {validationResult.warnings.map((warning, index) => (
                  <div key={index} className="warning-message">
                    {warning}
                  </div>
                ))}
              </div>
            )}

            <div className="confirm-notes">
              <h5>注意事項</h5>
              <ul>
                <li>リポジトリ内の Markdown ファイルが記事として公開されます</li>
                <li>main ブランチへのプッシュが自動的に検知されます</li>
                <li>記事は管理者の審査後に公開されます</li>
              </ul>
            </div>

            <div className="button-group">
              <button
                type="button"
                onClick={handleConfirmLink}
                disabled={loading}
                className="btn-primary"
              >
                {loading ? '連携中...' : '連携する'}
              </button>
              <button
                type="button"
                onClick={handleBack}
                disabled={loading}
                className="btn-secondary"
              >
                戻る
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 3: 完了画面 */}
      {step === 'complete' && (
        <div className="step-complete">
          <div className="complete-message">
            <div className="success-icon">✓</div>
            <h4>連携が完了しました</h4>
            <p>リポジトリ <strong>{selectedRepo?.fullName}</strong> と連携しました。</p>
            <p>main ブランチに Markdown ファイルをプッシュすると、記事として申請されます。</p>
          </div>
          <button
            type="button"
            onClick={handleReset}
            className="btn-secondary"
          >
            リポジトリを変更
          </button>
        </div>
      )}

      <style>{`
        .repository-selector {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .error-message {
          padding: 0.75rem 1rem;
          background: #fef2f2;
          border: 1px solid #fecaca;
          border-radius: 4px;
          color: #dc2626;
          font-size: 0.875rem;
          white-space: pre-line;
        }

        .linked-repository {
          padding: 1rem;
          background: #f0f9ff;
          border: 1px solid #bae6fd;
          border-radius: 8px;
        }

        .linked-repository h4 {
          margin: 0 0 0.75rem;
          font-size: 0.875rem;
          color: #0369a1;
        }

        .linked-repo-info {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .repo-name {
          font-weight: 600;
        }

        .app-install-box {
          padding: 1rem;
          background: #f5f5f5;
          border-radius: 8px;
          text-align: center;
        }

        .app-install-box p {
          margin: 0 0 1rem;
          color: #666;
        }

        .repository-list h4 {
          margin: 0 0 1rem;
          font-size: 1rem;
        }

        .repo-cards {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .repo-card {
          padding: 1rem;
          border: 1px solid #e0e0e0;
          border-radius: 8px;
          background: white;
        }

        .repo-card:hover {
          border-color: #0070f3;
        }

        .repo-card-header {
          margin-bottom: 0.75rem;
        }

        .repo-name-row {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          flex-wrap: wrap;
        }

        .repo-full-name {
          font-weight: 600;
          font-size: 1rem;
        }

        .badge {
          padding: 0.125rem 0.5rem;
          border-radius: 12px;
          font-size: 0.75rem;
          font-weight: 500;
        }

        .badge-private {
          background: #fef3c7;
          color: #92400e;
        }

        .badge-public {
          background: #d1fae5;
          color: #065f46;
        }

        .repo-description {
          margin: 0.5rem 0 0;
          color: #666;
          font-size: 0.875rem;
        }

        .repo-card-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .repo-meta {
          color: #888;
          font-size: 0.75rem;
        }

        .step-confirm .confirm-card {
          padding: 1.5rem;
          border: 1px solid #e0e0e0;
          border-radius: 8px;
          background: white;
        }

        .confirm-header {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 0.5rem;
        }

        .confirm-details {
          margin: 1rem 0;
          padding: 1rem;
          background: #f5f5f5;
          border-radius: 4px;
        }

        .confirm-details p {
          margin: 0.25rem 0;
          font-size: 0.875rem;
        }

        .warnings {
          margin: 1rem 0;
        }

        .warning-message {
          padding: 0.75rem 1rem;
          background: #fffbeb;
          border: 1px solid #fcd34d;
          border-radius: 4px;
          color: #92400e;
          font-size: 0.875rem;
        }

        .confirm-notes {
          margin: 1rem 0;
          padding: 1rem;
          background: #f0f9ff;
          border-radius: 4px;
        }

        .confirm-notes h5 {
          margin: 0 0 0.5rem;
          font-size: 0.875rem;
          color: #0369a1;
        }

        .confirm-notes ul {
          margin: 0;
          padding-left: 1.25rem;
          font-size: 0.875rem;
          color: #0369a1;
        }

        .confirm-notes li {
          margin: 0.25rem 0;
        }

        .step-complete {
          text-align: center;
        }

        .complete-message {
          padding: 2rem;
          background: #f0fdf4;
          border: 1px solid #86efac;
          border-radius: 8px;
          margin-bottom: 1rem;
        }

        .success-icon {
          width: 48px;
          height: 48px;
          margin: 0 auto 1rem;
          background: #22c55e;
          color: white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.5rem;
        }

        .complete-message h4 {
          margin: 0 0 0.5rem;
          color: #166534;
        }

        .complete-message p {
          margin: 0.5rem 0;
          color: #166534;
        }

        .button-group {
          display: flex;
          gap: 0.5rem;
          margin-top: 1rem;
        }

        .btn-primary {
          padding: 0.5rem 1rem;
          background: #0070f3;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 0.875rem;
        }

        .btn-primary:hover {
          background: #0051cc;
        }

        .btn-primary:disabled {
          background: #999;
          cursor: not-allowed;
        }

        .btn-secondary {
          padding: 0.5rem 1rem;
          background: white;
          color: #333;
          border: 1px solid #ccc;
          border-radius: 4px;
          cursor: pointer;
          font-size: 0.875rem;
          text-decoration: none;
          display: inline-block;
        }

        .btn-secondary:hover {
          background: #f0f0f0;
        }

        .btn-danger {
          padding: 0.5rem 1rem;
          background: #dc2626;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 0.875rem;
        }

        .btn-danger:hover {
          background: #b91c1c;
        }

        .btn-danger:disabled {
          background: #999;
          cursor: not-allowed;
        }

        .help-text {
          color: #666;
          font-size: 0.875rem;
        }

        .note {
          color: #888;
          font-size: 0.875rem;
        }
      `}</style>
    </div>
  );
}
