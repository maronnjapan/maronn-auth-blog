import { useState, useRef } from 'react';

const MAX_COMMENT_IMAGES = 5;
const COMMENT_IMAGE_PATH = '/comment-images/';

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const countCommentImages = (markdown: string): number => {
  if (!markdown) return 0;
  const escapedPath = escapeRegExp(COMMENT_IMAGE_PATH);
  const markdownRegex = new RegExp(`!\\[[^\\]]*\\]\\((?:[^)]+${escapedPath}[^)]+)\\)`, 'g');
  const htmlRegex = new RegExp(`<img[^>]+src=["'][^"']+${escapedPath}[^"']+["'][^>]*>`, 'g');
  const markdownMatches = markdown.match(markdownRegex) ?? [];
  const htmlMatches = markdown.match(htmlRegex) ?? [];
  return markdownMatches.length + htmlMatches.length;
};

interface CommentAuthor {
  id: string;
  username: string;
  displayName: string;
  iconUrl?: string;
}

interface CommentData {
  id: string;
  articleId: string;
  userId: string;
  bodyMarkdown: string;
  bodyHtml: string;
  createdAt: string;
  updatedAt: string;
  author?: CommentAuthor;
}

interface CommentSectionProps {
  articleId: string;
  initialComments: CommentData[];
  initialTotal: number;
  currentUser: {
    id: string;
    username: string;
    displayName: string;
    iconUrl?: string;
    permissions?: string[];
  } | null;
  apiUrl: string;
}

export default function CommentSection({
  articleId,
  initialComments,
  initialTotal,
  currentUser,
  apiUrl,
}: CommentSectionProps) {
  const [comments, setComments] = useState<CommentData[]>(initialComments);
  const [total, setTotal] = useState(initialTotal);

  return (
    <div style={styles.container}>
      <h2 style={styles.heading}>コメント ({total})</h2>

      {currentUser ? (
        <CommentForm
          articleId={articleId}
          currentUser={currentUser}
          apiUrl={apiUrl}
          onCommentCreated={(comment) => {
            setComments((prev) => [...prev, comment]);
            setTotal((prev) => prev + 1);
          }}
        />
      ) : (
        <div style={styles.loginPrompt}>
          <p>コメントするには<a href={`${apiUrl}/auth/login`} style={styles.loginLink}>ログイン</a>してください</p>
        </div>
      )}

      <div style={styles.commentList}>
        {comments.map((comment) => (
          <CommentItem
            key={comment.id}
            comment={comment}
            currentUser={currentUser}
            apiUrl={apiUrl}
            onDeleted={(id) => {
              setComments((prev) => prev.filter((c) => c.id !== id));
              setTotal((prev) => prev - 1);
            }}
          />
        ))}
        {comments.length === 0 && (
          <p style={styles.emptyMessage}>まだコメントはありません</p>
        )}
      </div>
    </div>
  );
}

// ---------- CommentForm ----------

interface CommentFormProps {
  articleId: string;
  currentUser: NonNullable<CommentSectionProps['currentUser']>;
  apiUrl: string;
  onCommentCreated: (comment: CommentData) => void;
}

function CommentForm({ articleId, currentUser, apiUrl, onCommentCreated }: CommentFormProps) {
  const [body, setBody] = useState('');
  const [activeTab, setActiveTab] = useState<'write' | 'preview'>('write');
  const [previewHtml, setPreviewHtml] = useState('');
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const commentImageCount = countCommentImages(body);
  const hasReachedImageLimit = commentImageCount >= MAX_COMMENT_IMAGES;

  const handleTabSwitch = async (tab: 'write' | 'preview') => {
    setActiveTab(tab);
    if (tab === 'preview' && body.trim()) {
      setLoadingPreview(true);
      try {
        const response = await fetch(`${apiUrl}/comments/preview`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ bodyMarkdown: body }),
        });
        if (response.ok) {
          const data = await response.json();
          setPreviewHtml(data.html);
        } else {
          setPreviewHtml('<p>プレビューの取得に失敗しました</p>');
        }
      } catch {
        setPreviewHtml('<p>プレビューの取得に失敗しました</p>');
      } finally {
        setLoadingPreview(false);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim()) return;

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`${apiUrl}/comments/articles/${articleId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ bodyMarkdown: body }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error?.message || 'コメントの投稿に失敗しました');
      }

      const comment = await response.json();
      onCommentCreated(comment);
      setBody('');
      setActiveTab('write');
      setPreviewHtml('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'コメントの投稿に失敗しました');
    } finally {
      setSubmitting(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (hasReachedImageLimit) {
      setError(`画像は最大${MAX_COMMENT_IMAGES}枚まで添付できます`);
      e.target.value = '';
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('image', file);

      const response = await fetch(`${apiUrl}/comments/images`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error?.message || '画像のアップロードに失敗しました');
      }

      const { url } = await response.json();
      const markdownImage = `![${file.name}](${url})`;

      // Insert at cursor position
      const textarea = textareaRef.current;
      if (textarea) {
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const newBody = body.substring(0, start) + markdownImage + body.substring(end);
        setBody(newBody);
      } else {
        setBody((prev) => prev + '\n' + markdownImage);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '画像のアップロードに失敗しました');
    } finally {
      setUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div style={styles.formContainer}>
      <div style={styles.formHeader}>
        <div style={styles.authorInfo}>
          {currentUser.iconUrl ? (
            <img
              src={currentUser.iconUrl}
              alt={currentUser.displayName}
              style={styles.avatar}
            />
          ) : (
            <div style={styles.avatarPlaceholder}>
              {currentUser.displayName.charAt(0).toUpperCase()}
            </div>
          )}
          <span style={styles.authorName}>{currentUser.displayName}</span>
        </div>
      </div>

      <div style={styles.tabs}>
        <button
          type="button"
          style={activeTab === 'write' ? styles.tabActive : styles.tab}
          onClick={() => handleTabSwitch('write')}
        >
          書く
        </button>
        <button
          type="button"
          style={activeTab === 'preview' ? styles.tabActive : styles.tab}
          onClick={() => handleTabSwitch('preview')}
        >
          プレビュー
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        {activeTab === 'write' ? (
          <div>
            <textarea
              ref={textareaRef}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Markdownでコメントを書く..."
              style={styles.textarea}
              rows={6}
            />
            <div style={styles.toolbar}>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={handleImageUpload}
                style={{ display: 'none' }}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading || hasReachedImageLimit}
                style={styles.uploadButton}
                title={
                  hasReachedImageLimit
                    ? `画像は最大${MAX_COMMENT_IMAGES}枚まで添付できます`
                    : '画像をアップロード'
                }
              >
                {uploading ? 'アップロード中...' : '画像を追加'}
              </button>
              <span
                style={{
                  ...styles.imageCounter,
                  color: hasReachedImageLimit ? '#d32f2f' : '#666',
                }}
              >
                画像 {commentImageCount}/{MAX_COMMENT_IMAGES}
              </span>
            </div>
          </div>
        ) : (
          <div style={styles.previewArea}>
            {loadingPreview ? (
              <p style={styles.loadingText}>プレビューを読み込み中...</p>
            ) : body.trim() ? (
              <div
                className="znc"
                dangerouslySetInnerHTML={{ __html: previewHtml }}
              />
            ) : (
              <p style={styles.emptyPreview}>プレビューするコンテンツがありません</p>
            )}
          </div>
        )}

        {error && <div style={styles.error}>{error}</div>}

        <div style={styles.formActions}>
          <button
            type="submit"
            disabled={submitting || !body.trim()}
            style={
              submitting || !body.trim()
                ? styles.submitButtonDisabled
                : styles.submitButton
            }
          >
            {submitting ? '投稿中...' : 'コメントする'}
          </button>
        </div>
      </form>
    </div>
  );
}

// ---------- CommentItem ----------

interface CommentItemProps {
  comment: CommentData;
  currentUser: CommentSectionProps['currentUser'];
  apiUrl: string;
  onDeleted: (id: string) => void;
}

function CommentItem({ comment, currentUser, apiUrl, onDeleted }: CommentItemProps) {
  const [deleting, setDeleting] = useState(false);

  const isOwner = currentUser?.id === comment.userId;
  const isAdmin = currentUser?.permissions?.some((p) => p === 'admin:users') ?? false;
  const canDelete = isOwner || isAdmin;

  const handleDelete = async () => {
    if (!confirm('このコメントを削除しますか？')) return;

    setDeleting(true);
    try {
      const response = await fetch(`${apiUrl}/comments/${comment.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('コメントの削除に失敗しました');
      }

      onDeleted(comment.id);
    } catch {
      alert('コメントの削除に失敗しました');
    } finally {
      setDeleting(false);
    }
  };

  const createdDate = new Date(comment.createdAt).toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div style={styles.commentItem}>
      <div style={styles.commentHeader}>
        <div style={styles.commentAuthorInfo}>
          {comment.author?.iconUrl ? (
            <img
              src={comment.author.iconUrl}
              alt={comment.author.displayName}
              style={styles.commentAvatar}
            />
          ) : (
            <div style={styles.commentAvatarPlaceholder}>
              {(comment.author?.displayName || '?').charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <a
              href={`/${comment.author?.username}`}
              style={styles.commentAuthorName}
            >
              {comment.author?.displayName || '不明なユーザー'}
            </a>
            <time style={styles.commentDate}>{createdDate}</time>
          </div>
        </div>
        {canDelete && (
          <button
            onClick={handleDelete}
            disabled={deleting}
            style={styles.deleteButton}
            title="コメントを削除"
          >
            {deleting ? '削除中...' : '削除'}
          </button>
        )}
      </div>
      <div
        className="znc"
        style={styles.commentBody}
        dangerouslySetInnerHTML={{ __html: comment.bodyHtml }}
      />
    </div>
  );
}

// ---------- Styles ----------

const styles: Record<string, React.CSSProperties> = {
  container: {
    marginTop: '3rem',
    borderTop: '1px solid #e0e0e0',
    paddingTop: '2rem',
  },
  heading: {
    fontSize: '1.5rem',
    fontWeight: '600',
    marginBottom: '1.5rem',
  },
  loginPrompt: {
    padding: '1.5rem',
    background: '#f9f9f9',
    borderRadius: '8px',
    textAlign: 'center' as const,
    marginBottom: '1.5rem',
    color: '#666',
  },
  loginLink: {
    color: '#0066cc',
    textDecoration: 'none',
    fontWeight: '500',
  },
  commentList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '1rem',
  },
  emptyMessage: {
    color: '#999',
    textAlign: 'center' as const,
    padding: '2rem',
  },

  // Form
  formContainer: {
    border: '1px solid #e0e0e0',
    borderRadius: '8px',
    marginBottom: '2rem',
    overflow: 'hidden',
  },
  formHeader: {
    padding: '0.75rem 1rem',
    borderBottom: '1px solid #e0e0e0',
    background: '#fafafa',
  },
  authorInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  avatar: {
    width: '24px',
    height: '24px',
    borderRadius: '50%',
    objectFit: 'cover' as const,
  },
  avatarPlaceholder: {
    width: '24px',
    height: '24px',
    borderRadius: '50%',
    background: '#0066cc',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '0.75rem',
    fontWeight: '600',
  },
  authorName: {
    fontSize: '0.9rem',
    fontWeight: '500',
  },
  tabs: {
    display: 'flex',
    borderBottom: '1px solid #e0e0e0',
  },
  tab: {
    padding: '0.5rem 1rem',
    border: 'none',
    background: 'none',
    cursor: 'pointer',
    fontSize: '0.9rem',
    color: '#666',
    borderBottom: '2px solid transparent',
  },
  tabActive: {
    padding: '0.5rem 1rem',
    border: 'none',
    background: 'none',
    cursor: 'pointer',
    fontSize: '0.9rem',
    color: '#0066cc',
    fontWeight: '500',
    borderBottom: '2px solid #0066cc',
  },
  textarea: {
    width: '100%',
    padding: '1rem',
    border: 'none',
    borderBottom: '1px solid #e0e0e0',
    resize: 'vertical' as const,
    fontSize: '0.95rem',
    lineHeight: '1.6',
    fontFamily: 'monospace',
    minHeight: '120px',
    outline: 'none',
    boxSizing: 'border-box' as const,
  },
  toolbar: {
    padding: '0.5rem 1rem',
    borderBottom: '1px solid #e0e0e0',
    display: 'flex',
    gap: '0.5rem',
  },
  uploadButton: {
    padding: '0.3rem 0.75rem',
    fontSize: '0.85rem',
    border: '1px solid #ccc',
    borderRadius: '4px',
    background: '#fff',
    cursor: 'pointer',
    color: '#555',
  },
  imageCounter: {
    marginLeft: 'auto',
    fontSize: '0.8rem',
  },
  previewArea: {
    padding: '1rem',
    minHeight: '120px',
    borderBottom: '1px solid #e0e0e0',
  },
  loadingText: {
    color: '#999',
    fontStyle: 'italic',
  },
  emptyPreview: {
    color: '#999',
    fontStyle: 'italic',
  },
  error: {
    padding: '0.75rem 1rem',
    background: '#fff0f0',
    color: '#d32f2f',
    fontSize: '0.9rem',
  },
  formActions: {
    padding: '0.75rem 1rem',
    display: 'flex',
    justifyContent: 'flex-end',
  },
  submitButton: {
    padding: '0.5rem 1.5rem',
    fontSize: '0.9rem',
    fontWeight: '500',
    color: '#fff',
    background: '#0066cc',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
  },
  submitButtonDisabled: {
    padding: '0.5rem 1.5rem',
    fontSize: '0.9rem',
    fontWeight: '500',
    color: '#fff',
    background: '#99c2e8',
    border: 'none',
    borderRadius: '6px',
    cursor: 'not-allowed',
  },

  // Comment item
  commentItem: {
    border: '1px solid #e0e0e0',
    borderRadius: '8px',
    overflow: 'hidden',
  },
  commentHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0.75rem 1rem',
    background: '#fafafa',
    borderBottom: '1px solid #e0e0e0',
  },
  commentAuthorInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  commentAvatar: {
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    objectFit: 'cover' as const,
  },
  commentAvatarPlaceholder: {
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    background: '#0066cc',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '0.8rem',
    fontWeight: '600',
  },
  commentAuthorName: {
    fontSize: '0.9rem',
    fontWeight: '500',
    color: '#0066cc',
    textDecoration: 'none',
    display: 'block',
  },
  commentDate: {
    fontSize: '0.8rem',
    color: '#999',
    display: 'block',
  },
  deleteButton: {
    padding: '0.25rem 0.75rem',
    fontSize: '0.8rem',
    border: '1px solid #ddd',
    borderRadius: '4px',
    background: '#fff',
    color: '#d32f2f',
    cursor: 'pointer',
  },
  commentBody: {
    padding: '1rem',
  },
};
