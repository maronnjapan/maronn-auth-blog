# GitHub Blog Platform

GitHub リポジトリを CMS として利用するブログプラットフォーム。ユーザーは自身の GitHub リポジトリに Markdown と画像を置き、管理者の審査を経て記事を公開する。

## 技術スタック

| 項目 | 技術 |
|------|------|
| フロントエンド | Astro + React (Islands) |
| API | Hono on Cloudflare Workers |
| 認証 | Auth0（GitHub ソーシャルログイン）+ arctic |
| DB | Cloudflare D1 |
| キャッシュ | Cloudflare KV |
| 画像ストレージ | Cloudflare R2 |

詳細な仕様は [CLAUDE.md](./CLAUDE.md) を参照してください。

## 🚀 クイックスタート

### 前提条件

- Node.js 20+
- pnpm 8+
- Cloudflare アカウント
- Auth0 アカウント
- GitHub App（作成済み）

### 1. Auth0 アプリケーションの作成

1. [Auth0 Dashboard](https://manage.auth0.com/) にログイン
2. Applications > Create Application
3. "Regular Web Application" を選択
4. Settings で以下を確認：
   - Domain
   - Client ID
   - Client Secret
5. Connections で GitHub を有効化

### 2. GitHub App の作成

1. GitHub Settings > Developer settings > GitHub Apps > New GitHub App
2. 以下の権限を設定：
   - Repository contents: Read
   - Webhooks: Active
3. 以下の情報を確認：
   - App ID
   - Private Key（ダウンロード）
4. アプリをインストール

### 3. 開発環境のセットアップ

```bash
# リポジトリをクローン
git clone <repository-url>
cd maronn-auth-blog

# 依存関係をインストール
pnpm install

# 開発環境をセットアップ（対話式）
./setup-dev.sh
```

このスクリプトは以下を実行します：
- Auth0/GitHub App の情報を対話的に収集
- `packages/api/.dev.vars` を作成
- `packages/web/.env` を作成
- ローカル D1 データベースを初期化

### 4. 開発サーバーの起動

```bash
# すべてのパッケージを起動
pnpm dev

# または個別に起動
pnpm --filter web dev    # http://localhost:4321
pnpm --filter api dev    # http://localhost:8787
pnpm --filter embed dev  # http://localhost:8788
```

### 5. Auth0 コールバック URL の設定

Auth0 Dashboard で以下を追加：
- Allowed Callback URLs: `http://localhost:8787/auth/callback`
- Allowed Logout URLs: `http://localhost:4321`
- Allowed Web Origins: `http://localhost:4321`

## 📦 本番デプロイ

### 前提条件

- Cloudflare アカウントでログイン済み
  ```bash
  wrangler login
  ```

### デプロイの実行

```bash
# デプロイスクリプトを実行（対話式）
./deploy.sh
```

このスクリプトは以下を自動実行します：

1. **環境変数の収集**
   - Auth0 設定（Domain, Client ID, Client Secret）
   - GitHub App 設定（App ID, Private Key）
   - セッションシークレット（自動生成）

2. **Cloudflare リソースの作成**
   - D1 データベース
   - KV ネームスペース（セッション用・キャッシュ用）
   - R2 バケット（画像保存用）

3. **データベースの初期化**
   - スキーマの適用

4. **設定ファイルの更新**
   - `wrangler.toml` にリソース ID を設定

5. **シークレットの設定**
   - 環境変数を Cloudflare Workers に設定

6. **ビルドとデプロイ**
   - API（Workers）
   - Embed（Workers）
   - Web（Pages）

### デプロイ後の設定

デプロイ完了後、以下を手動で設定してください：

1. **Auth0 コールバック URL の更新**
   ```
   Allowed Callback URLs: https://<project>-api.workers.dev/auth/callback
   Allowed Logout URLs: https://<project>.pages.dev
   Allowed Web Origins: https://<project>.pages.dev
   ```

2. **GitHub App Webhook URL の設定**
   ```
   Webhook URL: https://<project>-api.workers.dev/webhook/github
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

## 🛠️ 開発ガイド

### コマンド

```bash
# 開発
pnpm dev              # すべてのパッケージ
pnpm --filter api dev # API のみ
pnpm --filter web dev # Web のみ

# ビルド
pnpm build

# テスト
pnpm test

# 型チェック
pnpm typecheck

# Lint
pnpm lint
```

### テスト駆動開発 (TDD)

本プロジェクトは TDD で開発しています。新機能の実装前に、まずテストを書いてください。

```bash
# テストの実行
pnpm --filter api test

# テストの監視
pnpm --filter api test:watch
```

## 🧪 環境変数

### 開発環境（ローカル）

#### packages/api/.dev.vars

```env
AUTH0_DOMAIN=your-tenant.auth0.com
AUTH0_CLIENT_ID=xxx
AUTH0_CLIENT_SECRET=xxx
AUTH0_CALLBACK_URL=http://localhost:8787/auth/callback

GITHUB_APP_ID=123456
GITHUB_APP_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\n..."

SESSION_SECRET=random-32-char-string

EMBED_ORIGIN=http://localhost:8788
```

#### packages/web/.env

```env
PUBLIC_API_URL=http://localhost:8787
PUBLIC_APP_URL=http://localhost:4321
```

### 本番環境

本番環境の環境変数は `deploy.sh` スクリプトが自動的に設定します。

### アーキテクチャ

DDD ライクなレイヤー構造を採用:

- **Controllers**: HTTP リクエスト/レスポンス処理
- **Usecases**: ビジネスロジック
- **Domain**: エンティティ、値オブジェクト、ドメインルール
- **Infrastructure**: 外部サービス連携 (DB, GitHub, Auth0)

詳細は [CLAUDE.md](./CLAUDE.md) を参照してください。

## 🔧 トラブルシューティング

### wrangler がインストールされていない

```bash
pnpm add -g wrangler
```

### Cloudflare にログインできない

```bash
wrangler login
```

### ローカル D1 データベースがリセットされた場合

```bash
cd packages/api
wrangler d1 execute blog-db --file=../../scripts/schema.sql --local
```

または、`setup-dev.sh` を再実行してください。

### デプロイ時にリソースが既に存在するエラー

デプロイスクリプトは既存のリソースを検出して再利用します。
リソース ID を確認するには：

```bash
wrangler d1 list
wrangler kv:namespace list
wrangler r2 bucket list
```

### デプロイ後に 500 エラーが発生する

1. Cloudflare Workers のログを確認：
   ```bash
   wrangler tail <project>-api
   ```

2. シークレットが正しく設定されているか確認：
   ```bash
   cd packages/api
   wrangler secret list
   ```

3. 設定が不足している場合は再設定：
   ```bash
   wrangler secret put AUTH0_DOMAIN
   ```

## 📋 Phase 1 (MVP) 実装状況

- [x] プロジェクトセットアップ (モノレポ、pnpm)
- [x] 認証 (Auth0 + GitHub ログイン)
- [x] ユーザー登録・プロフィール
- [x] GitHub App 連携
- [x] 記事取得・パース・表示
- [x] 審査フロー (承認・却下)
- [x] 画像処理・R2 保存
- [x] KV キャッシュ
- [x] フィード表示
- [x] 自動デプロイスクリプト

## 📄 ライセンス

MIT

## 🤝 コントリビューション

詳細は [CLAUDE.md](./CLAUDE.md) の実装規約を参照してください。
