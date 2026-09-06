# Auth Vault

認証・認可・セキュリティについて書いている個人ブログ。

記事はこのリポジトリの `articles/` に Markdown で置き、`main` へ push すると
GitHub Actions が静的サイトをビルドして Cloudflare へデプロイする。
サイトにログイン機能や投稿フォームはなく、**投稿できるのはこのリポジトリへ push できる人だけ**。

詳しい仕様と実装規約は [CLAUDE.md](./CLAUDE.md) を参照。

## 構成

| パッケージ | 役割 |
|------------|------|
| `packages/web` | Astro による静的サイト。全ページをビルド時に生成する |
| `packages/embed` | X・Gist・リンクカードなどの埋め込み iframe を配信する Cloudflare Worker |

記事と画像はリポジトリ直下の `articles/` と `images/` に置く。
DB もオブジェクトストレージも使わず、リポジトリ内のファイルが唯一の情報源。

## 記事を書く

### 1. Markdown を追加する

`articles/<slug>.md` を作る。ファイル名がそのまま URL（`/articles/<slug>`）になる。

```markdown
---
title: "記事タイトル"
emoji: "🔐"
topics: ["OAuth", "Auth0"]
published: true
published_at: 2025-08-16 22:00
targetCategories: ["authorization"]
---

## はじめに

本文...
```

| 項目 | 必須 | 説明 |
|------|------|------|
| `title` | ✅ | 記事タイトル |
| `published` | ✅ | `true` で公開。`false` の記事はビルド対象から外れる |
| `emoji` | | 一覧に出すアイコン。未設定なら 📝 |
| `topics` | | トピック。`/topics/<topic>` の一覧ページが自動で作られる |
| `published_at` | | 公開日。**設定した記事だけ日付が表示され、新しい順に並ぶ** |
| `targetCategories` | | `authentication` / `authorization` / `security` から選ぶ |

### 2. 画像を追加する

`images/<slug>/` に置き、記事からは絶対パスで参照する。

```markdown
![](/images/mcp-authorization/flow.png)
```

### 3. ローカルで確認する

```bash
pnpm install
pnpm --filter @maronn-auth-blog/web dev   # http://localhost:4321
```

記事や画像を足したときは開発サーバーを再起動する（生成物はサーバー起動時に作られる）。

### 4. push する

`main` へ push すると自動でデプロイされる。

## 開発

```bash
pnpm install                                  # 依存関係のインストール
pnpm dev                                      # web と embed を並列起動
pnpm build                                    # ビルド
pnpm test                                     # テスト
pnpm typecheck                                # 型チェック
pnpm --filter @maronn-auth-blog/web content   # 記事の再生成だけ実行する
```

### 環境変数

`packages/web/.env`（すべて任意。未設定でもビルドは通る）

```env
PUBLIC_SITE_URL=http://localhost:4321
PUBLIC_EMBED_ORIGIN=http://localhost:8788
PUBLIC_CF_WEB_ANALYTICS_TOKEN=
```

`packages/embed/.dev.vars` は embed Worker 側の設定に従う。

## デプロイ

GitHub Actions が `main` への push を検知して実行する。

| ワークフロー | 対象の変更 |
|--------------|------------|
| `.github/workflows/deploy-web.yml` | `articles/`, `images/`, `packages/web/` |
| `.github/workflows/deploy-embed.yml` | `packages/embed/` |

必要な GitHub の設定:

- Secrets: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`
- Variables: `PUBLIC_SITE_URL`, `PUBLIC_EMBED_ORIGIN`, `PUBLIC_CF_WEB_ANALYTICS_TOKEN`

手元からデプロイする場合:

```bash
pnpm --filter @maronn-auth-blog/web deploy:production
```

web は静的アセットのみを配信する Worker としてデプロイされる（`packages/web/wrangler.toml`）。

## トラブルシューティング

### ビルドが記事のエラーで止まる

`prepare-content.mjs` は frontmatter が不正な記事を見つけるとファイル名付きで失敗する。
壊れた記事をそのまま公開しないための仕様なので、メッセージのファイルを直してから再実行する。

### 追加した画像が表示されない

`images/<slug>/` に置いたか、記事の参照が `/images/` から始まる絶対パスかを確認する。
開発サーバーは起動時に画像を同期するため、追加後は再起動が必要。

### 記事の順番が想定と違う

`published_at` が無い記事は日付つきの記事のあとに slug 順で並ぶ。
順番を決めたい記事には `published_at` を書く。

## ライセンス

MIT
