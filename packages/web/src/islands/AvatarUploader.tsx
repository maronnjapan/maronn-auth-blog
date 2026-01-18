import { useState, useRef } from 'react';

interface AvatarUploaderProps {
  currentAvatarUrl?: string;
  displayName: string;
  apiUrl: string;
  onUploadComplete?: (newUrl: string) => void;
}

const MAX_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export default function AvatarUploader({
  currentAvatarUrl,
  displayName,
  apiUrl,
  onUploadComplete,
}: AvatarUploaderProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setSuccessMessage(null);

    // Client-side validation
    if (!ALLOWED_TYPES.includes(file.type)) {
      setError('JPG、PNG、WebP形式のみアップロード可能です');
      return;
    }

    if (file.size > MAX_SIZE) {
      setError('ファイルサイズは2MB以下にしてください');
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onload = () => setPreviewUrl(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleUpload = async () => {
    const file = fileInputRef.current?.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${apiUrl}/avatars/upload`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error?.message || 'アップロードに失敗しました');
      }

      const { avatarUrl } = await response.json();
      setPreviewUrl(null);
      setSuccessMessage('プロフィール画像を更新しました');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      onUploadComplete?.(avatarUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'アップロードに失敗しました');
    } finally {
      setUploading(false);
    }
  };

  const handleCancel = () => {
    setPreviewUrl(null);
    setError(null);
    setSuccessMessage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const displayUrl = previewUrl || currentAvatarUrl;

  return (
    <div className="avatar-uploader">
      <div className="avatar-preview">
        {displayUrl ? (
          <img src={displayUrl} alt={displayName} className="avatar-image" />
        ) : (
          <div className="avatar-placeholder">
            {displayName.charAt(0).toUpperCase()}
          </div>
        )}
      </div>

      <div className="avatar-controls">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleFileSelect}
          className="file-input"
          id="avatar-input"
        />
        <label htmlFor="avatar-input" className="btn-file-select">
          画像を選択
        </label>

        {previewUrl && (
          <div className="button-group">
            <button
              onClick={handleUpload}
              disabled={uploading}
              className="btn-primary"
            >
              {uploading ? 'アップロード中...' : 'アップロード'}
            </button>
            <button
              onClick={handleCancel}
              disabled={uploading}
              className="btn-secondary"
            >
              キャンセル
            </button>
          </div>
        )}

        {error && <p className="error-message">{error}</p>}
        {successMessage && <p className="success-message">{successMessage}</p>}

        <p className="help-text">
          JPG、PNG、WebP形式、2MB以下
        </p>
      </div>

      <style>{`
        .avatar-uploader {
          display: flex;
          align-items: flex-start;
          gap: 1.5rem;
        }

        .avatar-preview {
          flex-shrink: 0;
        }

        .avatar-image {
          width: 100px;
          height: 100px;
          border-radius: 50%;
          object-fit: cover;
          border: 2px solid #e0e0e0;
        }

        .avatar-placeholder {
          width: 100px;
          height: 100px;
          border-radius: 50%;
          background: #e0e0e0;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 2.5rem;
          font-weight: bold;
          color: #666;
        }

        .avatar-controls {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .file-input {
          display: none;
        }

        .btn-file-select {
          display: inline-block;
          padding: 0.5rem 1rem;
          background: #f0f0f0;
          border: 1px solid #ccc;
          border-radius: 4px;
          cursor: pointer;
          font-size: 0.875rem;
          text-align: center;
          max-width: 120px;
        }

        .btn-file-select:hover {
          background: #e0e0e0;
        }

        .button-group {
          display: flex;
          gap: 0.5rem;
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
        }

        .btn-secondary:hover {
          background: #f0f0f0;
        }

        .btn-secondary:disabled {
          background: #f0f0f0;
          color: #999;
          cursor: not-allowed;
        }

        .error-message {
          color: #f44336;
          font-size: 0.875rem;
          margin: 0;
        }

        .success-message {
          color: #4caf50;
          font-size: 0.875rem;
          margin: 0;
        }

        .help-text {
          color: #666;
          font-size: 0.75rem;
          margin: 0;
        }
      `}</style>
    </div>
  );
}
