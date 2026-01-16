# GitHub Blog Platform

GitHub リポジトリを CMS として利用するブログプラットフォーム。ユーザーは自身の GitHub リポジトリに Markdown と画像を置き、管理者の審査を経て記事を公開する。

## アーキテクチャ

- **フロントエンド**: Astro + React (Islands)
- **API**: Hono on Cloudflare Workers
- **認証**: Auth0 (GitHub ソーシャルログイン)
- **データベース**: Cloudflare D1
- **キャッシュ**: Cloudflare KV
- **画像ストレージ**: Cloudflare R2
- **GitHub 連携**: GitHub App (Installation Access Token)

詳細な仕様は [CLAUDE.md](./CLAUDE.md) を参照してください。

## セットアップ

### 前提条件

- Node.js 20+
- pnpm 8+
- Cloudflare アカウント
- Auth0 アカウント
- GitHub App

### インストール

```bash
# 依存関係のインストール
pnpm install
```

### 環境変数

#### API (`packages/api/.dev.vars`)

```bash
cp packages/api/.dev.vars.example packages/api/.dev.vars
```

以下の値を設定:

- `AUTH0_DOMAIN`: Auth0 のドメイン
- `AUTH0_CLIENT_ID`: Auth0 クライアント ID
- `AUTH0_CLIENT_SECRET`: Auth0 クライアントシークレット
- `AUTH0_CALLBACK_URL`: Auth0 コールバック URL
- `GITHUB_APP_ID`: GitHub App ID
- `GITHUB_APP_PRIVATE_KEY`: GitHub App 秘密鍵
- `GITHUB_WEBHOOK_SECRET`: GitHub Webhook シークレット
- `SESSION_SECRET`: セッション暗号化用シークレット (32文字以上)
- `API_URL`: API の URL (開発時: `http://localhost:8787`)
- `WEB_URL`: Web フロントエンドの URL (開発時: `http://localhost:4321`)
- `EMBED_ORIGIN`: Embed サービスの URL (開発時: `http://localhost:8788`)

#### Web (`packages/web/.env`)

```bash
cp packages/web/.env.example packages/web/.env
```

以下の値を設定:

- `PUBLIC_API_URL`: API の URL
- `PUBLIC_APP_URL`: Web アプリの URL

### データベースのセットアップ

```bash
# D1 データベースの作成 (ローカル開発用)
cd packages/api
wrangler d1 create maronn-auth-blog-db

# マイグレーションの実行
wrangler d1 migrations apply maronn-auth-blog-db --local
```

### 開発サーバーの起動

```bash
# すべてのパッケージを起動
pnpm dev

# または個別に起動
pnpm --filter api dev     # API (port 8787)
pnpm --filter web dev     # Web (port 4321)
pnpm --filter embed dev   # Embed (port 8788)
```

## プロジェクト構造

```
/
├── packages/
│   ├── shared/         # 共通コード (型、スキーマ、エラー)
│   ├── api/            # Hono API
│   ├── web/            # Astro フロントエンド
│   └── embed/          # 埋め込みコンテンツサービス
├── pnpm-workspace.yaml
└── CLAUDE.md           # プロジェクト仕様書
```

## 開発ガイド

### コマンド

```bash
# 開発
pnpm dev

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

### テスト駆動開発 (TDD)

本プロジェクトは TDD で開発しています。新機能の実装前に、まずテストを書いてください。

```bash
# テストの実行
pnpm --filter api test

# テストの監視
pnpm --filter api test:watch
```

### アーキテクチャ

DDD ライクなレイヤー構造を採用:

- **Controllers**: HTTP リクエスト/レスポンス処理
- **Usecases**: ビジネスロジック
- **Domain**: エンティティ、値オブジェクト、ドメインルール
- **Infrastructure**: 外部サービス連携 (DB, GitHub, Auth0)

詳細は [CLAUDE.md](./CLAUDE.md) を参照してください。

## Phase 1 (MVP) 実装状況

- [x] プロジェクトセットアップ (モノレポ、pnpm)
- [x] 認証 (Auth0 + GitHub ログイン)
- [x] ユーザー登録・プロフィール
- [x] GitHub App 連携
- [x] 記事取得・パース・表示
- [x] 審査フロー (承認・却下)
- [x] 画像処理・R2 保存
- [x] KV キャッシュ
- [x] フィード表示

## ライセンス

MIT
