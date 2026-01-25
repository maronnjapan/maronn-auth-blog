import { useState } from 'react';

interface AdminReviewDetailProps {
  articleId: string;
  apiUrl: string;
  targetCategory?: 'authentication' | 'authorization' | 'security';
  markdown: string;
}

// targetCategoryごとのAIプロンプトテンプレート
const AI_PROMPT_TEMPLATES: Record<string, string> = {
  authentication: `あなたはブログ記事の審査担当者です。以下の記事が「認証（Authentication）」に関する内容として適切かどうかを判定してください。

## 判定基準
認証に関する記事として適切な内容の例：
- ユーザー認証の仕組み（パスワード認証、多要素認証、生体認証など）
- OAuth、OpenID Connect、SAML などの認証プロトコル
- JWT、セッション管理、トークンベース認証
- Auth0、Firebase Auth、Cognito などの認証サービス
- パスワードレス認証、SSO（シングルサインオン）
- 認証に関するセキュリティベストプラクティス

不適切な内容の例：
- 認可（Authorization）のみに焦点を当てた内容
- 認証と無関係な一般的なプログラミング話題
- 認証を装った広告や宣伝記事

## 審査対象の記事

\`\`\`markdown
{{ARTICLE_CONTENT}}
\`\`\`

## 回答フォーマット
以下の形式で回答してください：

**判定結果**: 適切 / 不適切 / 要修正

**理由**:
（判定理由を3-5文で説明）

**認証との関連性**:
（記事内容が認証とどのように関連しているか）

**改善提案**:（不適切または要修正の場合のみ）
（どのような修正が必要か）`,

  authorization: `あなたはブログ記事の審査担当者です。以下の記事が「認可（Authorization）」に関する内容として適切かどうかを判定してください。

## 判定基準
認可に関する記事として適切な内容の例：
- アクセス制御（RBAC、ABAC、ACL など）
- 権限管理、ロールベースアクセス制御
- OAuth 2.0 のスコープとパーミッション
- API のアクセス制御
- リソースベースのポリシー
- 認可に関するセキュリティベストプラクティス

不適切な内容の例：
- 認証（Authentication）のみに焦点を当てた内容
- 認可と無関係な一般的なプログラミング話題
- 認可を装った広告や宣伝記事

## 審査対象の記事

\`\`\`markdown
{{ARTICLE_CONTENT}}
\`\`\`

## 回答フォーマット
以下の形式で回答してください：

**判定結果**: 適切 / 不適切 / 要修正

**理由**:
（判定理由を3-5文で説明）

**認可との関連性**:
（記事内容が認可とどのように関連しているか）

**改善提案**:（不適切または要修正の場合のみ）
（どのような修正が必要か）`,

  security: `あなたはブログ記事の審査担当者です。以下の記事が「セキュリティ」に関する内容として適切かどうかを判定してください。

## 判定基準
セキュリティに関する記事として適切な内容の例：
- Webセキュリティ（XSS、CSRF、SQLインジェクション対策など）
- 暗号化、ハッシュ化、デジタル署名
- セキュリティヘッダー、CORS、CSP
- 脆弱性診断、ペネトレーションテスト
- セキュアコーディングプラクティス
- インシデント対応、セキュリティ監視

不適切な内容の例：
- セキュリティと無関係な一般的なプログラミング話題
- 攻撃手法の詳細な説明（悪用目的と判断されるもの）
- セキュリティを装った広告や宣伝記事

## 審査対象の記事

\`\`\`markdown
{{ARTICLE_CONTENT}}
\`\`\`

## 回答フォーマット
以下の形式で回答してください：

**判定結果**: 適切 / 不適切 / 要修正

**理由**:
（判定理由を3-5文で説明）

**セキュリティとの関連性**:
（記事内容がセキュリティとどのように関連しているか）

**改善提案**:（不適切または要修正の場合のみ）
（どのような修正が必要か）`,
};

const TARGET_CATEGORY_LABELS: Record<string, string> = {
  authentication: '認証',
  authorization: '認可',
  security: 'セキュリティ',
};

export default function AdminReviewDetail({ articleId, apiUrl, targetCategory, markdown }: AdminReviewDetailProps) {
  const [submitting, setSubmitting] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [copied, setCopied] = useState(false);

  const handleCopyPrompt = async () => {
    if (!targetCategory || !markdown) {
      alert('記事情報が不足しています');
      return;
    }

    const template = AI_PROMPT_TEMPLATES[targetCategory];
    if (!template) {
      alert('対応するプロンプトテンプレートがありません');
      return;
    }

    const prompt = template.replace('{{ARTICLE_CONTENT}}', markdown);

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

  return (
    <div className="review-actions-container">
      {targetCategory && (
        <div className="ai-check-section">
          <h4>AIチェック</h4>
          <p className="category-info">
            対象カテゴリ: <strong>{TARGET_CATEGORY_LABELS[targetCategory] || targetCategory}</strong>
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
