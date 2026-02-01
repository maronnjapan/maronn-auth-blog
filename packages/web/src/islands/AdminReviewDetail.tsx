import { useState } from 'react';

type TargetCategory = 'authentication' | 'authorization' | 'security';

interface AdminReviewDetailProps {
  articleId: string;
  apiUrl: string;
  targetCategories?: TargetCategory[];
  markdown: string;
}

const TARGET_CATEGORY_LABELS: Record<string, string> = {
  authentication: '認証',
  authorization: '認可',
  security: 'セキュリティ',
};

// 複数カテゴリーを一度にチェックできるプロンプト
function generateCombinedPrompt(categories: TargetCategory[], articleContent: string): string {
  const categoryDescriptions = categories.map(cat => {
    switch (cat) {
      case 'authentication':
        return `### 認証（Authentication）
適切な内容の例：
- ユーザー認証の仕組み（パスワード認証、多要素認証、生体認証など）
- OAuth、OpenID Connect、SAML などの認証プロトコル
- JWT、セッション管理、トークンベース認証
- Auth0、Firebase Auth、Cognito などの認証サービス
- パスワードレス認証、SSO（シングルサインオン）
- 認証に関するセキュリティベストプラクティス`;
      case 'authorization':
        return `### 認可（Authorization）
適切な内容の例：
- アクセス制御（RBAC、ABAC、ACL など）
- 権限管理、ロールベースアクセス制御
- OAuth 2.0 のスコープとパーミッション
- API のアクセス制御
- リソースベースのポリシー
- 認可に関するセキュリティベストプラクティス`;
      case 'security':
        return `### セキュリティ
適切な内容の例：
- Webセキュリティ（XSS、CSRF、SQLインジェクション対策など）
- 暗号化、ハッシュ化、デジタル署名
- セキュリティヘッダー、CORS、CSP
- 脆弱性診断、ペネトレーションテスト
- セキュアコーディングプラクティス
- インシデント対応、セキュリティ監視`;
    }
  }).join('\n\n');

  const categoryLabels = categories.map(cat => TARGET_CATEGORY_LABELS[cat]).join('、');

  return `あなたはブログ記事の審査担当者です。以下の記事が指定されたカテゴリー（${categoryLabels}）に関する内容として適切かどうかを判定してください。

## 判定対象カテゴリー

${categoryDescriptions}

## 不適切な内容の共通例
- 指定されたカテゴリーと無関係な一般的なプログラミング話題
- カテゴリーを装った広告や宣伝記事
- 攻撃手法の詳細な説明（悪用目的と判断されるもの）

## 審査対象の記事

\`\`\`markdown
${articleContent}
\`\`\`

## 回答フォーマット
以下の形式で回答してください：

**判定結果**: 適切 / 不適切 / 要修正

**カテゴリー別評価**:
${categories.map(cat => `- ${TARGET_CATEGORY_LABELS[cat]}: （適切/不適切/部分的に関連）`).join('\n')}

**理由**:
（判定理由を3-5文で説明）

**記事内容との関連性**:
（記事内容が各カテゴリーとどのように関連しているか）

**改善提案**:（不適切または要修正の場合のみ）
（どのような修正が必要か）`;
}

export default function AdminReviewDetail({ articleId, apiUrl, targetCategories, markdown }: AdminReviewDetailProps) {
  const [submitting, setSubmitting] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [copied, setCopied] = useState(false);

  const handleCopyPrompt = async () => {
    if (!targetCategories || targetCategories.length === 0 || !markdown) {
      alert('記事情報が不足しています');
      return;
    }

    const prompt = generateCombinedPrompt(targetCategories, markdown);

    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      alert('クリップボードへのコピーに失敗しました');
    }
  };

  const handleApprove = async () => {
    if (!confirm('この記事を承認しますか？')) {
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`${apiUrl}/admin/reviews/${articleId}/approve`, {
        method: 'POST',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('承認に失敗しました');
      }

      alert('記事を承認しました');
      window.location.href = '/admin/reviews';
    } catch (err) {
      alert(err instanceof Error ? err.message : '承認に失敗しました');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      alert('却下理由を入力してください');
      return;
    }

    if (!confirm('この記事を却下しますか？')) {
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`${apiUrl}/admin/reviews/${articleId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ reason: rejectionReason }),
      });

      if (!response.ok) {
        throw new Error('却下に失敗しました');
      }

      alert('記事を却下しました');
      window.location.href = '/admin/reviews';
    } catch (err) {
      alert(err instanceof Error ? err.message : '却下に失敗しました');
    } finally {
      setSubmitting(false);
    }
  };

  const categoryLabels = targetCategories?.map(cat => TARGET_CATEGORY_LABELS[cat] || cat).join('、') || '';

  return (
    <div className="review-actions-container">
      {targetCategories && targetCategories.length > 0 && (
        <div className="ai-check-section">
          <h4>AIチェック</h4>
          <p className="category-info">
            対象カテゴリ: <strong>{categoryLabels}</strong>
          </p>
          <button onClick={handleCopyPrompt} className="btn-copy-prompt">
            {copied ? 'コピーしました!' : 'AIチェック用プロンプトをコピー'}
          </button>
        </div>
      )}

      <div className="review-actions">
        <div className="approve-section">
          <button onClick={handleApprove} disabled={submitting} className="btn-approve">
            {submitting ? '処理中...' : '承認する'}
          </button>
        </div>

        <div className="reject-section">
          <label htmlFor="rejectionReason">却下理由</label>
          <textarea
            id="rejectionReason"
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            placeholder="却下する理由を入力してください"
            rows={4}
          />
          <button onClick={handleReject} disabled={submitting} className="btn-reject">
            {submitting ? '処理中...' : '却下する'}
          </button>
        </div>
      </div>
    </div>
  );
}
