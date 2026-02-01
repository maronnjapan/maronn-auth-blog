# 環境変数リスタ

プロジェクト全体で使用する環境変数の一覧です。

- **必須 / オプション** カラムで設定の要否を示します。
- **ローカル開発値** は `pnpm dev` で動作する最小設定です。
- Cloudflare Bindings（`DB`, `KV`, `R2`）は環境変数ではなく `wrangler.toml` で定義されるバインディングです。

---

## packages/api（Cloudflare Workers）

設定先: `packages/api/.dev.vars`（ローカル開発）/ Cloudflare Dashboard の Secret（本番）

型定義: [`packages/api/src/types/env.ts`](../packages/api/src/types/env.ts)

### 環境識別

| 環境変数 | 必須 | ローカル開発値 | 説明 |
|----------|------|---------------|------|
| `ENVIRONMENT` | 必須 | `development` | `development` または `production` のいずれか。本番では `wrangler.toml` の `[env.production.vars]` で自動設定される。Cookie の `secure` フラグや `sameSite` の値をこの値で切り替える。 |

### Auth0（認証）

| 環境変数 | 必須 | ローカル開発値 | 説明 |
|----------|------|---------------|------|
| `AUTH0_DOMAIN` | 必須 | `your-tenant.auth0.com` | Auth0 テナントのドメイン名。arctic ライブラリの `Auth0` クライアント初期化に使用する。 |
| `AUTH0_CLIENT_ID` | 必須 | ― | Auth0 アプリケーションのクライアント ID。OAuth 認可リクエストに含める。 |
| `AUTH0_CLIENT_SECRET` | 必須 | ― | Auth0 アプリケーションのクライアットシークレット。認可コード → トークン交換に使用する。 |
| `AUTH0_CALLBACK_URL` | 必須 | `http://localhost:8787/auth/callback` | Auth0 に登録したコールバック URL。Auth0 管理画面の設定と完全に一致する必要がある。 |

### GitHub App

| 環境変数 | 必須 | ローカル開発値 | 説明 |
|----------|------|---------------|------|
| `GITHUB_APP_ID` | 必須 | `123456` | GitHub App のアプリ ID。`@octokit/auth-app` で Installation Access Token を生成する際に使用する。 |
| `GITHUB_APP_PRIVATE_KEY` | 必須 | ― | GitHub App の秘密鍵（RSA PEM 形式）。JWT署名と Installation Access Token の取得に使用する。改行は `\n` でエスケープして一行で設定する。 |
| `GITHUB_WEBHOOK_SECRET` | 必須 | ― | GitHub App の Webhook 設定画面で生成するシークレット。受信したWebhookのx-hub-signature-256署名を検証する。 |

### セッション

| 環境変数 | 必須 | ローカル開発値 | 説明 |
|----------|------|---------------|------|
| `SESSION_SECRET` | 必須 | ― | セッション ID の暗号化・復号に使用するシークレット。最低32文字以上のランダム文字列を設定する。 |

### URL

| 環境変数 | 必須 | ローカル開発値 | 説明 |
|----------|------|---------------|------|
| `API_URL` | 必須 | `http://localhost:8787` | API サービス自身の公開 URL。Auth0Client に渡し、認証フローの各ステップで参照される。 |
| `WEB_URL` | 必須 | `http://localhost:4321` | Web フロントエンドの公開 URL。ログイン完了後のリダイレクト先として使用する。 |
| `EMBED_ORIGIN` | 必須 | `http://localhost:8788` | embed サービスのオリジン URL。`zenn-markdown-html` の `embedOrigin` オプションとして渡し、埋め込み iframe の URL を生成する。 |
| `IMAGE_URL` | 必須 | `http://localhost:8787` | 画像配信のベース URL。記事 HTML 内の相対画像パスを `/images/:userId/:slug/:filename` 形式の絶対 URL に変換する際に使用する。 |

### Cookie

| 環境変数 | 必須 | ローカル開発値 | 説明 |
|----------|------|---------------|------|
| `COOKIE_DOMAIN` | オプション | 未設定 | サブドメイン間で Cookie を共有するための親ドメイン（例: `.maronn-room.com`）。設定すると session Cookie と OAuth Cookie がこのドメイン配下の全サブドメインで読み取り可能になる。本番のサブドメイン構成で必要。 |

### Cloudflare Bindings

`wrangler.toml` で定義されるバインディング。`.dev.vars` には記載しない。

| バインディング名 | 種類 | 説明 |
|-----------------|------|------|
| `DB` | D1Database | アプリケーションのSQL データベース。ユーザー、記事、リポジトリ等のデータを保持する。 |
| `KV` | KVNamespace | キーバリューストア。セッションデータの保持と、公開記事の レンダリング済み HTML のキャッシュに使用する。 |
| `R2` | R2Bucket | オブジェクトストレージ。記事に添付される画像とユーザーアバターの永続保存先。 |

---

## packages/web（Astro フロントエンド）

設定先: `packages/web/.env`（ローカル開発）/ Cloudflare Dashboard の環境変数（本番）

テンプレート: [`packages/web/.env.example`](../packages/web/.env.example)

Astro では `PUBLIC_` プレフィックス付きの変数がブラウザ側にも公開される。

| 環境変数 | 必須 | ローカル開発値 | 説明 |
|----------|------|---------------|------|
| `PUBLIC_API_URL` | 必須 | `http://localhost:8787` | API サービスの公開 URL。Astro ページでサーバーサイドフェッチ、ブラウザ側の API クライアントでリクエスト先として使用する。 |
| `PUBLIC_APP_URL` | 必須 | `http://localhost:4321` | Web アプリ自身の公開 URL。GitHub App の Post installation redirect URL の設定値などで参照される。 |
| `PUBLIC_GITHUB_APP_INSTALL_URL` | 必須 | `https://github.com/apps/<app-slug>/installations/new` | GitHub App のインストール URL。ダッシュボード設定ページで「GitHub App をインストール」ボタンのリンク先として表示される。 |

---

## 環境別設定チャンプレート

### ローカル開発

**packages/api/.dev.vars**

```env
ENVIRONMENT=development

AUTH0_DOMAIN=your-tenant.auth0.com
AUTH0_CLIENT_ID=your-client-id
AUTH0_CLIENT_SECRET=your-client-secret
AUTH0_CALLBACK_URL=http://localhost:8787/auth/callback

GITHUB_APP_ID=123456
GITHUB_APP_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----\n"
GITHUB_WEBHOOK_SECRET=your-webhook-secret

SESSION_SECRET=your-random-32-or-more-character-string

API_URL=http://localhost:8787
WEB_URL=http://localhost:4321
EMBED_ORIGIN=http://localhost:8788
IMAGE_URL=http://localhost:8787
```

**packages/web/.env**

```env
PUBLIC_API_URL=http://localhost:8787
PUBLIC_APP_URL=http://localhost:4321
PUBLIC_GITHUB_APP_INSTALL_URL=https://github.com/apps/<app-slug>/installations/new
```

### 本番環境

本番環境では以下の変更が必要です。

| パッケージ | 環境変数 | 本番値の例 |
|-----------|----------|-----------|
| api | `ENVIRONMENT` | `production`（`wrangler.toml` で自動設定） |
| api | `AUTH0_CALLBACK_URL` | `https://api.maronn-room.com/auth/callback` |
| api | `API_URL` | `https://api.maronn-room.com` |
| api | `WEB_URL` | `https://web.maronn-room.com` |
| api | `EMBED_ORIGIN` | `https://embed.maronn-room.com` |
| api | `IMAGE_URL` | `https://api.maronn-room.com` |
| api | `COOKIE_DOMAIN` | `.maronn-room.com` |
| web | `PUBLIC_API_URL` | `https://api.maronn-room.com` |
| web | `PUBLIC_APP_URL` | `https://web.maronn-room.com` |
