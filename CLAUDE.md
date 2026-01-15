# GitHub Blog Platform

GitHub リポジトリを CMS として利用するブログプラットフォーム。ユーザーは自身の GitHub リポジトリに Markdown と画像を置き、管理者の審査を経て記事を公開する。

## 技術スタック

| 項目 | 技術 |
|------|------|
| フロントエンド | Astro + React (Islands) |
| API | Hono on Cloudflare Workers |
| 型安全 API クライアント | Hono RPC (`hc`) |
| 認証 | Auth0（GitHub ソーシャルログイン） |
| DB | Cloudflare D1 |
| キャッシュ（HTML） | Cloudflare KV |
| 画像ストレージ | Cloudflare R2 |
| GitHub 連携 | GitHub App（Installation Access Token） |
| Markdown パーサー | zenn-markdown-html |
| テスト | Vitest |
| パッケージマネージャー | pnpm |

## ディレクトリ構成

```
/
├── packages/
│   ├── web/                    # Astro フロントエンド
│   │   ├── src/
│   │   │   ├── components/     # Astro/React コンポーネント
│   │   │   ├── layouts/        # レイアウト
│   │   │   ├── pages/          # ページ
│   │   │   └── islands/        # React Islands（動的 UI）
│   │   ├── astro.config.mjs
│   │   └── package.json
│   │
│   ├── api/                    # Hono API
│   │   ├── src/
│   │   │   ├── controllers/    # HTTP リクエスト/レスポンス処理
│   │   │   ├── usecases/       # ビジネスロジック
│   │   │   ├── domain/         # エンティティ、値オブジェクト
│   │   │   │   ├── entities/
│   │   │   │   ├── value-objects/
│   │   │   │   └── errors/
│   │   │   ├── infrastructure/ # 外部サービス連携
│   │   │   │   ├── repositories/
│   │   │   │   └── storage/
│   │   │   ├── middleware/     # 認証等ミドルウェア
│   │   │   └── index.ts        # エントリーポイント
│   │   ├── wrangler.toml
│   │   └── package.json
│   │
│   ├── embed/                  # 埋め込みコンテンツ用エンドポイント
│   │   ├── src/
│   │   │   └── index.ts        # Twitter, YouTube 等の埋め込み処理
│   │   ├── wrangler.toml
│   │   └── package.json
│   │
│   └── shared/                 # 共有コード
│       ├── src/
│       │   ├── types/          # 型定義
│       │   ├── schemas/        # Zod スキーマ
│       │   ├── errors/         # 共通エラークラス
│       │   └── utils/          # ユーティリティ
│       └── package.json
│
├── pnpm-workspace.yaml
├── package.json
├── tsconfig.json
└── CLAUDE.md
```

## コマンド

```bash
# 依存関係インストール
pnpm install

# 開発サーバー起動
pnpm dev              # 全パッケージ
pnpm --filter web dev # フロントエンドのみ
pnpm --filter api dev # API のみ

# ビルド
pnpm build

# テスト
pnpm test

# 型チェック
pnpm typecheck

# Lint
pnpm lint

# デプロイ
pnpm deploy
```

## 環境変数

### packages/api/.dev.vars

```
AUTH0_DOMAIN=your-tenant.auth0.com
AUTH0_CLIENT_ID=xxx
AUTH0_CLIENT_SECRET=xxx
AUTH0_CALLBACK_URL=http://localhost:8787/auth/callback

GITHUB_APP_ID=123456
GITHUB_APP_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\n..."

SESSION_SECRET=random-32-char-string
```

### packages/web/.env

```
PUBLIC_API_URL=http://localhost:8787
PUBLIC_APP_URL=http://localhost:4321
```

---

# アーキテクチャ

## 全体フロー

```
┌─────────────────────────────────────────────────────────────────┐
│                        Cloudflare                               │
│  ┌───────────┐    ┌───────────┐    ┌────┐   ┌────┐   ┌────┐   │
│  │   Astro   │───▶│   Hono    │───▶│ D1 │   │ KV │   │ R2 │   │
│  │  (Pages)  │    │ (Workers) │    └────┘   └────┘   └────┘   │
│  └───────────┘    └─────┬─────┘                                │
│                         │                                       │
└─────────────────────────┼───────────────────────────────────────┘
                          │
                          ▼
                    ┌───────────┐
                    │  GitHub   │
                    │   API     │
                    └───────────┘
```

## 認証フロー

```
1. ユーザーが「ログイン」ボタンをクリック
2. /api/auth/login へリダイレクト
3. Auth0 認可画面へリダイレクト
4. ユーザーが GitHub 連携を許可
5. 認可コード付きで /api/auth/callback へリダイレクト
6. サーバーが認可コードを Auth0 トークンエンドポイントに送信
7. アクセストークン・ID トークンを取得
8. セッションを作成し、KV に保存
9. セッション ID を暗号化して Cookie に設定
10. フロントエンドにリダイレクト
```

### セッション管理

- セッション ID は暗号化して HttpOnly Cookie に保存
- セッションデータ（トークン、ユーザー情報）は KV に保存
- トークンはクライアントに露出しない

## GitHub App 連携

### 権限

- Repository contents: read（Markdown・画像取得用）

### Webhook イベント

- `push`: main ブランチへのプッシュを検知

### Installation Access Token

```typescript
import { createAppAuth } from '@octokit/auth-app';

async function getInstallationToken(installationId: string, env: Env) {
  const auth = createAppAuth({
    appId: env.GITHUB_APP_ID,
    privateKey: env.GITHUB_APP_PRIVATE_KEY,
  });

  const { token } = await auth({
    type: 'installation',
    installationId,
  });

  return token; // 1時間有効
}
```

---

# データモデル

## D1 スキーマ

### users

```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  icon_url TEXT,
  bio TEXT,
  github_user_id TEXT NOT NULL,
  github_installation_id TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_github_user_id ON users(github_user_id);
```

### repositories

```sql
CREATE TABLE repositories (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  github_repo_full_name TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id)
);
```

### articles

```sql
CREATE TABLE articles (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  category TEXT,
  status TEXT DEFAULT 'pending_new' CHECK (
    status IN ('pending_new', 'pending_update', 'published', 'rejected', 'deleted')
  ),
  github_path TEXT NOT NULL,
  github_sha TEXT,
  published_sha TEXT,
  rejection_reason TEXT,
  published_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, slug)
);

CREATE INDEX idx_articles_user_id ON articles(user_id);
CREATE INDEX idx_articles_status ON articles(status);
CREATE INDEX idx_articles_published_at ON articles(published_at DESC);
```

### article_tags

```sql
CREATE TABLE article_tags (
  id TEXT PRIMARY KEY,
  article_id TEXT NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  tag TEXT NOT NULL,
  UNIQUE(article_id, tag)
);

CREATE INDEX idx_article_tags_tag ON article_tags(tag);
```

## KV 設計

### セッションデータ

```
キー: session:{session_id}
値: {
  userId: string,
  accessToken: string,
  refreshToken: string,
  idToken: string,
  expiresAt: number  // アクセストークンの有効期限
}
TTL: 90日（スライディング、アクセスのたびに延長）
```

- リフレッシュトークンでアクセストークンを自動更新
- アクセスのたびに KV の TTL をリセット（スライディングセッション）
- 90日間アクセスがなければ自動ログアウト

### レンダリング済み HTML

```
キー: article:{user_id}:{slug}
値: HTML 文字列
TTL: なし（明示的に更新・削除）
```

## R2 設計

### 画像

```
キー: images/{user_id}/{slug}/{filename}
例: images/abc123/hello-world/screenshot.png
```

---

# API エンドポイント

## 認証

| メソッド | パス | 説明 |
|----------|------|------|
| GET | /auth/login | Auth0 認可画面へリダイレクト |
| GET | /auth/callback | Auth0 コールバック、セッション作成 |
| POST | /auth/logout | セッション削除 |
| GET | /auth/me | 現在のユーザー情報取得 |

## ユーザー

| メソッド | パス | 説明 |
|----------|------|------|
| GET | /users/:username | ユーザー情報取得 |
| PUT | /users/me | プロフィール更新 |
| GET | /users/me/repository | 連携リポジトリ取得 |
| PUT | /users/me/repository | リポジトリ連携 |
| DELETE | /users/me/repository | リポジトリ連携解除 |

## 記事

| メソッド | パス | 説明 |
|----------|------|------|
| GET | /articles | 公開記事一覧（フィード） |
| GET | /articles/:username/:slug | 記事詳細 |
| GET | /users/:username/articles | ユーザーの公開記事一覧 |
| DELETE | /articles/:id | 記事削除（所有者のみ） |

## ダッシュボード

| メソッド | パス | 説明 |
|----------|------|------|
| GET | /dashboard/articles | 自分の記事一覧（全ステータス） |
| GET | /dashboard/notifications | 通知一覧 |

## 管理者

| メソッド | パス | 説明 |
|----------|------|------|
| GET | /admin/reviews | 審査待ち記事一覧 |
| GET | /admin/reviews/:id | 審査対象記事詳細（プレビュー） |
| POST | /admin/reviews/:id/approve | 記事承認 |
| POST | /admin/reviews/:id/reject | 記事却下 |

## Webhook

| メソッド | パス | 説明 |
|----------|------|------|
| POST | /webhook/github | GitHub Webhook 受信 |

## 画像

| メソッド | パス | 説明 |
|----------|------|------|
| GET | /images/:userId/:slug/:filename | R2 から画像取得 |

---

# 主要な実装詳細

## Markdown 処理

### パース・変換

```typescript
import markdownToHtml from 'zenn-markdown-html';

interface ParsedArticle {
  frontmatter: {
    title: string;
    published: boolean;
    category?: string;
    tags?: string[];
  };
  content: string;
  html: string;
  images: string[];
}

function parseArticle(markdown: string, embedOrigin: string): ParsedArticle {
  const { frontmatter, content } = extractFrontmatter(markdown);
  
  const html = markdownToHtml(content, {
    embedOrigin, // 自前の embed エンドポイント
  });
  
  const images = extractImagePaths(content);
  
  return { frontmatter, content, html, images };
}
```

### フロントマター

```yaml
---
title: 記事タイトル        # 必須
published: true           # 必須、true で申請対象
category: 認証            # 任意
tags: [auth0, oauth]      # 任意、最大10個
---
```

- `slug` はファイル名から自動取得（`hello-world.md` → `hello-world`）
- 同一ユーザー内で slug 重複はエラー

### 画像パス変換

Markdown 内の相対パスを R2 の URL に変換する。

```typescript
function convertImagePaths(
  html: string,
  userId: string,
  slug: string,
  apiUrl: string
): string {
  return html.replace(
    /src="\.\/images\/([^"]+)"/g,
    `src="${apiUrl}/images/${userId}/${slug}/$1"`
  );
}
```

## 埋め込みコンテンツ (embed)

`zenn-markdown-html` が生成する埋め込み iframe 用のエンドポイント。

### 対応サービス

- Twitter/X
- YouTube
- GitHub Gist
- CodePen
- その他 oEmbed 対応サービス

### 実装方針

```typescript
// packages/embed/src/index.ts
app.get('/embed/:service', async (c) => {
  const service = c.req.param('service');
  const url = c.req.query('url');
  
  switch (service) {
    case 'twitter':
      return handleTwitterEmbed(url);
    case 'youtube':
      return handleYouTubeEmbed(url);
    // ...
  }
});
```

## 画像処理

### 制限

| 項目 | 制限 |
|------|------|
| 許可形式 | jpg, jpeg, png, webp, gif（静止画のみ） |
| 1ファイル上限 | 3 MB |
| 記事あたり上限 | 20 枚 |
| 動画 | 禁止 |

### バリデーション

```typescript
const MAX_SIZE = 3 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_IMAGES_PER_ARTICLE = 20;

async function validateImage(response: Response): Promise<void> {
  const contentType = response.headers.get('content-type');
  const contentLength = parseInt(response.headers.get('content-length') || '0');
  
  if (!ALLOWED_TYPES.some(t => contentType?.startsWith(t))) {
    throw new Error('Unsupported file type');
  }
  
  if (contentLength > MAX_SIZE) {
    throw new Error('File too large');
  }
}
```

## Webhook 処理

### GitHub push イベント

```typescript
app.post('/webhook/github', async (c) => {
  const signature = c.req.header('x-hub-signature-256');
  const payload = await c.req.text();
  
  // 署名検証
  if (!verifyWebhookSignature(payload, signature, env.GITHUB_WEBHOOK_SECRET)) {
    return c.json({ error: 'Invalid signature' }, 401);
  }
  
  const data = JSON.parse(payload);
  
  // main ブランチ以外は無視
  if (data.ref !== 'refs/heads/main') {
    return c.json({ ok: true });
  }
  
  const repoFullName = data.repository.full_name;
  const modifiedFiles = data.commits.flatMap(
    (commit: any) => [...commit.added, ...commit.modified]
  );
  
  // Markdown ファイルを抽出
  const mdFiles = modifiedFiles.filter((f: string) => f.endsWith('.md'));
  
  for (const filePath of mdFiles) {
    await processArticleUpdate(repoFullName, filePath, env);
  }
  
  return c.json({ ok: true });
});
```

---

# 審査フロー

## ステータス遷移

```
                     push (published: true)
                              │
                              ▼
                       ┌─────────────┐
                       │ pending_new │
                       └──────┬──────┘
                              │
              ┌───────────────┼───────────────┐
              │ approve       │               │ reject
              ▼               │               ▼
       ┌───────────┐          │        ┌──────────┐
       │ published │          │        │ rejected │
       └─────┬─────┘          │        └──────────┘
             │                │
             │ push (update)  │
             ▼                │
      ┌────────────────┐      │
      │ pending_update │──────┘
      └────────┬───────┘
               │
   ┌───────────┼───────────┐
   │ approve   │           │ reject
   ▼           │           ▼
published      │     旧版を維持
(上書き)       │     (pending_update のまま or rejected)
               │
               │ delete
               ▼
          ┌─────────┐
          │ deleted │
          └─────────┘
```

## 承認処理

```typescript
async function approveArticle(articleId: string, env: Env) {
  const article = await getArticle(articleId, env);
  const user = await getUser(article.userId, env);
  const repo = await getRepository(user.id, env);
  
  // GitHub からコンテンツ取得
  const token = await getInstallationToken(user.githubInstallationId, env);
  const markdown = await fetchMarkdownFromGitHub(
    repo.githubRepoFullName,
    article.githubPath,
    token
  );
  
  // パース
  const parsed = parseArticle(markdown, env.EMBED_ORIGIN);
  
  // 画像を R2 に保存
  for (const imagePath of parsed.images) {
    const imageData = await fetchImageFromGitHub(
      repo.githubRepoFullName,
      imagePath,
      token
    );
    await env.R2.put(
      `images/${user.id}/${article.slug}/${getFileName(imagePath)}`,
      imageData
    );
  }
  
  // HTML を KV に保存
  const html = convertImagePaths(parsed.html, user.id, article.slug, env.API_URL);
  await env.KV.put(`article:${user.id}:${article.slug}`, html);
  
  // DB 更新
  await updateArticle(articleId, {
    status: 'published',
    publishedSha: article.githubSha,
    publishedAt: new Date().toISOString(),
  }, env);
}
```

---

# URL 構造

| ページ | URL |
|--------|-----|
| トップ（フィード） | `/` |
| ユーザーページ | `/{username}` |
| 記事詳細 | `/{username}/articles/{slug}` |
| ダッシュボード | `/dashboard` |
| ダッシュボード - 記事一覧 | `/dashboard/articles` |
| ダッシュボード - 通知 | `/dashboard/notifications` |
| ダッシュボード - 設定 | `/dashboard/settings` |
| 管理者 - 審査一覧 | `/admin/reviews` |
| 管理者 - 審査詳細 | `/admin/reviews/{id}` |

---

# 実装規約

## テスト駆動開発 (TDD)

本プロジェクトは TDD で開発する。

### 基本サイクル

```
1. Red: 失敗するテストを書く
2. Green: テストが通る最小限のコードを書く
3. Refactor: コードを整理する（テストは通ったまま）
```

### テストファイル配置

```
packages/api/src/
├── usecases/
│   ├── article/
│   │   ├── approve-article.ts
│   │   └── approve-article.test.ts  # 同階層に配置
```

### テスト方針

- ユースケース層は単体テスト必須
- ドメイン層のロジックは単体テスト必須
- コントローラー層は結合テストで主要フローをカバー
- 外部 API（GitHub, Auth0）はモック必須

### モック

```typescript
// GitHub API のモック例
vi.mock('../infrastructure/github-client', () => ({
  fetchMarkdown: vi.fn().mockResolvedValue('# Hello'),
  fetchImage: vi.fn().mockResolvedValue(new ArrayBuffer(100)),
}));
```

---

## アーキテクチャ (DDD ライク)

厳密な DDD ではないが、責務の分離を重視する。

### レイヤー構成

```
packages/api/src/
├── controllers/      # HTTP リクエスト/レスポンス処理
├── usecases/         # ビジネスロジック（アプリケーション層）
├── domain/           # ドメインモデル、ドメインロジック
├── infrastructure/   # 外部サービス連携（GitHub, Auth0, DB）
└── middleware/       # 認証、エラーハンドリング等
```

### 各レイヤーの責務

| レイヤー | 責務 | 依存先 |
|----------|------|--------|
| controllers | HTTP 処理、バリデーション、レスポンス整形 | usecases |
| usecases | ビジネスロジックの実行、トランザクション管理 | domain, infrastructure |
| domain | エンティティ、値オブジェクト、ドメインルール | なし（純粋） |
| infrastructure | DB アクセス、外部 API 呼び出し | 外部サービス |

### 依存の方向

```
controllers → usecases → domain
                ↓
           infrastructure
```

- domain は他のレイヤーに依存しない
- infrastructure の具体実装は usecases から注入

### ディレクトリ例

```
packages/api/src/
├── controllers/
│   └── article-controller.ts      # ルーティング、リクエスト処理
│
├── usecases/
│   └── article/
│       ├── approve-article.ts     # 承認ユースケース
│       ├── approve-article.test.ts
│       ├── reject-article.ts      # 却下ユースケース
│       └── reject-article.test.ts
│
├── domain/
│   ├── entities/
│   │   ├── user.ts                # User エンティティ
│   │   └── article.ts             # Article エンティティ
│   ├── value-objects/
│   │   ├── slug.ts                # Slug 値オブジェクト
│   │   └── article-status.ts      # ステータス値オブジェクト
│   └── errors/
│       └── domain-errors.ts       # ドメイン固有エラー
│
└── infrastructure/
    ├── repositories/
    │   ├── user-repository.ts     # D1 アクセス
    │   └── article-repository.ts
    ├── github-client.ts           # GitHub API クライアント
    ├── auth0-client.ts            # Auth0 クライアント
    └── storage/
        ├── kv-client.ts           # KV アクセス
        └── r2-client.ts           # R2 アクセス
```

### 実装例

```typescript
// domain/entities/article.ts
export class Article {
  constructor(
    public readonly id: string,
    public readonly userId: string,
    public readonly slug: Slug,
    public readonly title: string,
    private _status: ArticleStatus,
  ) {}

  get status(): ArticleStatus {
    return this._status;
  }

  approve(): void {
    if (!this._status.canApprove()) {
      throw new InvalidStatusTransitionError(this._status, 'published');
    }
    this._status = ArticleStatus.published();
  }

  reject(reason: string): void {
    if (!this._status.canReject()) {
      throw new InvalidStatusTransitionError(this._status, 'rejected');
    }
    this._status = ArticleStatus.rejected(reason);
  }
}

// usecases/article/approve-article.ts
export class ApproveArticleUsecase {
  constructor(
    private articleRepo: ArticleRepository,
    private githubClient: GitHubClient,
    private kvClient: KVClient,
    private r2Client: R2Client,
  ) {}

  async execute(articleId: string): Promise<void> {
    const article = await this.articleRepo.findById(articleId);
    if (!article) throw new ArticleNotFoundError(articleId);

    const markdown = await this.githubClient.fetchMarkdown(/* ... */);
    const parsed = parseArticle(markdown);

    // 画像を R2 に保存
    for (const image of parsed.images) {
      const data = await this.githubClient.fetchImage(/* ... */);
      await this.r2Client.put(/* ... */);
    }

    // HTML を KV に保存
    await this.kvClient.put(/* ... */);

    // ドメインロジック実行
    article.approve();

    // 永続化
    await this.articleRepo.save(article);
  }
}

// controllers/article-controller.ts
app.post('/admin/reviews/:id/approve', adminOnly(), async (c) => {
  const articleId = c.req.param('id');
  const usecase = new ApproveArticleUsecase(/* 依存注入 */);

  await usecase.execute(articleId);

  return c.json({ success: true });
});
```

---

## 型・バリデーション

### Zod スキーマ

共通スキーマは `packages/shared` に配置。パッケージ固有の拡張は共通から継承する。

```
packages/shared/src/schemas/
├── user.ts           # User 関連スキーマ
├── article.ts        # Article 関連スキーマ
└── common.ts         # 共通スキーマ（ID, datetime 等）
```

```typescript
// packages/shared/src/schemas/article.ts
import { z } from 'zod';

export const slugSchema = z
  .string()
  .min(1)
  .max(100)
  .regex(/^[a-z0-9-]+$/);

export const articleStatusSchema = z.enum([
  'pending_new',
  'pending_update',
  'published',
  'rejected',
  'deleted',
]);

export const articleSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  slug: slugSchema,
  title: z.string().min(1).max(200),
  category: z.string().max(50).optional(),
  status: articleStatusSchema,
});

// 入力用（id なし）
export const articleInputSchema = articleSchema.omit({ id: true, status: true });

// API レスポンス用
export const articleResponseSchema = articleSchema.extend({
  createdAt: z.string().datetime(),
  publishedAt: z.string().datetime().optional(),
});
```

```typescript
// packages/api/src/controllers/article-controller.ts
// API 固有の拡張
import { articleInputSchema } from '@your-app/shared';

const createArticleRequestSchema = articleInputSchema.extend({
  githubPath: z.string(),
});
```

### 型の命名規則

| 種類 | 命名 | 例 |
|------|------|-----|
| エンティティ | そのまま | `User`, `Article` |
| 入力 | `*Input` | `ArticleInput` |
| API レスポンス | `*Response` | `ArticleResponse` |
| DB 行 | `*Row` | `ArticleRow` |
| Zod スキーマ | `*Schema` | `articleSchema` |

### any 禁止・型ガード

```typescript
// ❌ Bad
function processData(data: any) {
  return data.value;
}

// ✅ Good
function processData(data: unknown): string {
  if (!isValidData(data)) {
    throw new InvalidDataError();
  }
  return data.value;
}

function isValidData(data: unknown): data is { value: string } {
  return (
    typeof data === 'object' &&
    data !== null &&
    'value' in data &&
    typeof (data as { value: unknown }).value === 'string'
  );
}

// ✅ Better: Zod で型ガード
import { z } from 'zod';

const dataSchema = z.object({ value: z.string() });

function processData(data: unknown): string {
  const parsed = dataSchema.parse(data);
  return parsed.value;
}
```

---

## エラーハンドリング

### カスタムエラークラス

```typescript
// packages/shared/src/errors/base.ts
export abstract class AppError extends Error {
  abstract readonly code: string;
  abstract readonly statusCode: number;

  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }

  toJSON() {
    return {
      error: {
        code: this.code,
        message: this.message,
      },
    };
  }
}

// packages/api/src/domain/errors/domain-errors.ts
export class ArticleNotFoundError extends AppError {
  readonly code = 'ARTICLE_NOT_FOUND';
  readonly statusCode = 404;

  constructor(articleId: string) {
    super(`Article not found: ${articleId}`);
  }
}

export class InvalidStatusTransitionError extends AppError {
  readonly code = 'INVALID_STATUS_TRANSITION';
  readonly statusCode = 400;

  constructor(from: string, to: string) {
    super(`Cannot transition from ${from} to ${to}`);
  }
}
```

### API エラーレスポンス

```typescript
// 統一フォーマット
{
  "error": {
    "code": "ARTICLE_NOT_FOUND",
    "message": "Article not found: abc123"
  }
}
```

```typescript
// エラーハンドリングミドルウェア
app.onError((err, c) => {
  if (err instanceof AppError) {
    return c.json(err.toJSON(), err.statusCode);
  }

  console.error(err);
  return c.json({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred',
    },
  }, 500);
});
```

---

## コード規約

### 命名規則

| 対象 | 規則 | 例 |
|------|------|-----|
| 変数・関数 | camelCase | `getUserById`, `articleCount` |
| クラス・型 | PascalCase | `ArticleRepository`, `UserInput` |
| ファイル（コンポーネント以外） | kebab-case | `article-repository.ts` |
| React コンポーネント | PascalCase | `ArticleCard.tsx` |
| 定数 | SCREAMING_SNAKE_CASE | `MAX_IMAGE_SIZE` |
| 環境変数 | SCREAMING_SNAKE_CASE | `AUTH0_CLIENT_ID` |

### インポート順序

```typescript
// 1. 外部パッケージ
import { Hono } from 'hono';
import { z } from 'zod';

// 2. 内部パッケージ（モノレポ内）
import { articleSchema } from '@your-app/shared';

// 3. 相対パス（遠い順）
import { ApproveArticleUsecase } from '../../usecases/article/approve-article';
import { articleRepository } from '../repositories/article-repository';

// 4. 型インポート
import type { Article } from '../../domain/entities/article';
```

### 環境変数アクセス

直接アクセスせず、バリデーション層を経由する。

```typescript
// packages/api/src/config.ts
import { z } from 'zod';

const envSchema = z.object({
  AUTH0_DOMAIN: z.string(),
  AUTH0_CLIENT_ID: z.string(),
  AUTH0_CLIENT_SECRET: z.string(),
  GITHUB_APP_ID: z.string(),
  GITHUB_APP_PRIVATE_KEY: z.string(),
  SESSION_SECRET: z.string().min(32),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(env: unknown): Env {
  return envSchema.parse(env);
}
```

### React 規約

#### useEffect の禁止

**CRITICAL: `useEffect` の使用は一切禁止する。**

理由:
- データフェッチは Astro のサーバーサイドで行うべき
- クライアントサイドでのデータフェッチはパフォーマンスとユーザー体験を悪化させる
- ウォーターフォールリクエストを避ける
- SEO とアクセシビリティの向上

#### データフェッチの正しいパターン

```typescript
// ❌ Bad: useEffect でデータフェッチ
export default function ArticleList() {
  const [articles, setArticles] = useState([]);

  useEffect(() => {
    fetch('/api/articles')
      .then(res => res.json())
      .then(data => setArticles(data));
  }, []);

  return <div>{/* ... */}</div>;
}
```

```astro
---
// ✅ Good: Astro でサーバーサイドフェッチ
const API_URL = import.meta.env.PUBLIC_API_URL;
const response = await fetch(`${API_URL}/articles`);
const data = await response.json();
---

<ArticleList articles={data.articles} client:load />
```

```typescript
// ✅ Good: Props でデータを受け取る
interface ArticleListProps {
  articles: Article[];
}

export default function ArticleList({ articles }: ArticleListProps) {
  return (
    <div>
      {articles.map(article => (
        <ArticleCard key={article.id} article={article} />
      ))}
    </div>
  );
}
```

#### クライアントサイドでの状態管理

ユーザーインタラクションによる状態変更のみ `useState` を使用する。

```typescript
// ✅ Good: ユーザーアクションによる状態管理
export default function SettingsForm({ initialData }: Props) {
  const [displayName, setDisplayName] = useState(initialData.displayName);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch('/api/users/me', {
      method: 'PUT',
      body: JSON.stringify({ displayName }),
    });
  };

  return <form onSubmit={handleSubmit}>{/* ... */}</form>;
}
```

### Astro レンダリング戦略 (SSG/SSR/Hybrid)

本プロジェクトは Astro の **hybrid モード**を使用する。

#### レンダリングモード

```typescript
// astro.config.mjs
export default defineConfig({
  output: 'hybrid', // SSG と SSR を併用可能
  adapter: cloudflare(),
});
```

#### ページごとのレンダリング選択

| ページタイプ | レンダリング方法 | 理由 |
|--------------|------------------|------|
| 公開記事一覧（フィード） | SSR | 最新記事を常に表示するため |
| ユーザーページ | SSR | 記事数や内容が動的に変化するため |
| 記事詳細 | SSR | 記事内容の更新を即座に反映するため |
| ダッシュボード | SSR（デフォルト） | 認証が必要、ユーザー固有の動的データ |
| 管理者ページ | SSR（デフォルト） | 認証・認可が必要、リアルタイムデータ |

#### SSR の利点（本プロジェクトでの選択理由）

- **常に最新のコンテンツ**: 記事の承認・更新が即座に反映される
- **認証との統合**: Cookie ベースのセッション認証と自然に統合
- **エッジレンダリング**: Cloudflare Pages のエッジで高速レンダリング
- **ビルド不要**: コンテンツ更新時に再ビルド・デプロイが不要

#### SSG を使用する場合（将来的な拡張）

完全に静的なページ（利用規約、プライバシーポリシー等）がある場合：

```astro
---
// src/pages/terms.astro
export const prerender = true; // このページのみ SSG
---

<h1>利用規約</h1>
<p>静的コンテンツ...</p>
```

#### パフォーマンス最適化

SSR でも十分高速な理由：

1. **サーバーサイドデータフェッチ**: useEffect による クライアントサイドフェッチを排除
2. **エッジレンダリング**: Cloudflare のグローバルエッジネットワークで実行
3. **HTMLキャッシュ**: KV に記事 HTML をキャッシュ（GitHub API を毎回叩かない）
4. **画像配信**: R2 から直接配信（GitHub API 不使用）

SSG を使わなくても、上記の最適化により初回表示は十分高速。

---

## Git 規約

### ブランチ戦略

```
main          # 本番環境（直 push 禁止）
├── develop   # 開発環境
└── feature/* # 機能開発
```

### コミットメッセージ

Conventional Commits に従う。

```
<type>(<scope>): <subject>

<body>
```

| type | 説明 |
|------|------|
| feat | 新機能 |
| fix | バグ修正 |
| docs | ドキュメント |
| style | フォーマット（コード変更なし） |
| refactor | リファクタリング |
| test | テスト追加・修正 |
| chore | ビルド、設定等 |

```
feat(article): 記事承認機能を追加

- 承認ユースケースを実装
- R2 への画像保存を追加
- KV への HTML キャッシュを追加
```

---

## ログ出力

### ログレベル

| レベル | 用途 |
|--------|------|
| error | 予期しないエラー、要対応 |
| warn | 想定内だが注意が必要な状態 |
| info | 重要な処理の開始・終了 |
| debug | 開発時のデバッグ情報 |

### 出力例

```typescript
// ユースケース内
console.info(`[ApproveArticle] Starting approval for article: ${articleId}`);
console.info(`[ApproveArticle] Article approved: ${articleId}`);

// エラー時
console.error(`[ApproveArticle] Failed to approve article: ${articleId}`, error);
```

---

# 開発フェーズ

## Phase 1: MVP

基本的なブログ機能を実装。

- [ ] プロジェクトセットアップ（モノレポ、pnpm）
- [ ] 認証（Auth0 + GitHub ログイン）
- [ ] ユーザー登録・プロフィール
- [ ] GitHub App 連携
- [ ] 記事取得・パース・表示
- [ ] 審査フロー（承認・却下）
- [ ] 画像処理・R2 保存
- [ ] KV キャッシュ
- [ ] フィード表示

## Phase 2: 機能拡充

- [ ] Webhook による自動更新検知
- [ ] カテゴリ・タグ機能
- [ ] 検索機能
- [ ] ページネーション
- [ ] 通知機能
- [ ] プロフィールページ充実

## Phase 3: 運用改善

- [ ] メール通知（Resend）
- [ ] 自動審査（画像チェック、禁止ワード）
- [ ] 複数管理者対応
- [ ] アナリティクス
- [ ] OGP 画像生成

---

# 注意事項

## セキュリティ

- トークンは絶対にクライアントに露出させない
- GitHub App の Private Key は環境変数で管理
- Webhook は署名検証を必ず行う
- セッション Cookie は HttpOnly, Secure, SameSite=Lax

## パフォーマンス

- 公開記事の HTML は KV にキャッシュ
- 画像は R2 から配信（GitHub API を叩かない）
- 一覧取得時は必要なカラムのみ SELECT

## GitHub API 制限

- Installation Access Token は 5,000 req/hour
- 読者アクセス時は GitHub API を叩かない設計
- Webhook 受信時のみ GitHub API を使用

## エラーハンドリング

- GitHub API エラー時は適切にリトライ
- Webhook 処理失敗時はログに記録
- ユーザー向けエラーメッセージは分かりやすく
