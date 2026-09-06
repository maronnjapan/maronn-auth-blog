# Auth Vault

運営者ひとりが執筆する技術ブログ。認証・認可・セキュリティに関する記事を扱う。

記事はこのリポジトリの `articles/` に Markdown で置き、`main` に push すると GitHub Actions が
静的サイトをビルドして Cloudflare へデプロイする。**投稿できるのはこのリポジトリへ push できる人だけ**で、
サイト上にログイン機能・投稿フォーム・審査フローは存在しない。

## 技術スタック

| 項目 | 技術 |
|------|------|
| サイト生成 | Astro（`output: 'static'` による全ページ静的生成） |
| UI 部品 | React（Astro Islands。動きが必要な箇所のみ hydrate） |
| Markdown パーサー | zenn-markdown-html + zenn-content-css |
| frontmatter パーサー | js-yaml |
| 埋め込み（tweet/gist 等） | Hono on Cloudflare Workers（`packages/embed`） |
| 配信 | Cloudflare Workers Static Assets |
| テスト | Vitest |
| パッケージマネージャー | pnpm |

サーバーサイドの API・データベース・オブジェクトストレージは使用しない。
記事も画像もリポジトリ内のファイルが唯一の情報源。

## ディレクトリ構成

```
/
├── articles/                   # 記事の Markdown（ファイル名が slug になる）
│   └── mcp-authorization.md
├── images/                     # 記事で使う画像（記事の slug ごとのディレクトリ）
│   └── mcp-authorization/*.png
├── workspace/                  # 執筆用の作業場（ネタ出し・下書き・設計メモ。サイトには出ない）
│   ├── 00_inbox/
│   ├── 01_designs/
│   └── 02_drafts/
├── packages/
│   ├── web/                    # Astro 静的サイト
│   │   ├── scripts/
│   │   │   ├── prepare-content.mjs       # 記事のパース・HTML 生成・画像同期
│   │   │   └── prepare-content.test.mjs
│   │   ├── src/
│   │   │   ├── content/legal/            # プライバシーポリシー等の Markdown
│   │   │   ├── generated/                # prepare-content.mjs の出力（gitignore）
│   │   │   ├── islands/                  # React コンポーネント
│   │   │   ├── layouts/                  # Astro レイアウト
│   │   │   ├── lib/                      # 記事の読み出し・ページング・TOC
│   │   │   └── pages/                    # ルーティング
│   │   ├── public/                       # 静的アセット（images/ は同期で生成）
│   │   ├── astro.config.mjs
│   │   └── wrangler.toml
│   └── embed/                  # 埋め込みコンテンツ用 Worker
├── tools/feature-extractor/    # 記事からキーワードを抽出する補助ツール（Python）
├── pnpm-workspace.yaml
└── CLAUDE.md
```

## コマンド

```bash
pnpm install                                  # 依存関係のインストール

pnpm --filter @maronn-auth-blog/web dev       # 開発サーバー（http://localhost:4321）
pnpm --filter @maronn-auth-blog/embed dev     # embed Worker（http://localhost:8788）
pnpm dev                                      # 上記を並列起動

pnpm --filter @maronn-auth-blog/web content   # 記事の再生成のみ（画像同期を含む）
pnpm build                                    # 全パッケージのビルド
pnpm test                                     # テスト
pnpm typecheck                                # 型チェック
```

`dev` / `build` / `typecheck` は実行前に `prepare-content.mjs` を必ず通す。
記事や画像を追加したら開発サーバーを再起動すること（生成物はビルド時に作られるため）。

## 環境変数

`packages/web/.env`。すべて任意で、未設定でもビルドは通る。

```
PUBLIC_SITE_URL=http://localhost:4321                 # 正規 URL・OGP・フィードの絶対 URL に使う
PUBLIC_EMBED_ORIGIN=http://localhost:8788             # 埋め込み iframe の配信元
PUBLIC_CF_WEB_ANALYTICS_TOKEN=                        # 設定するとアクセス解析タグを出力する
```

本番の値は GitHub Actions の Variables（`vars`）から渡す。

---

# 記事の書き方

## 1. Markdown を置く

`articles/<slug>.md` を作る。**ファイル名がそのまま URL の slug になる**（英小文字・数字・ハイフンのみ）。

```yaml
---
title: "記事タイトル"                        # 必須
emoji: "🔐"                                  # 任意。一覧のアイコン。未設定なら 📝
type: "tech"                                 # 任意。Zenn 互換のため残しているが表示には使わない
topics: ["OAuth", "Auth0"]                   # 任意。トピックページが自動生成される
published: true                              # 必須。false の記事はビルド対象から外れる
published_at: 2025-08-16 22:00               # 任意。未設定なら日付を表示せず一覧の末尾に並ぶ
targetCategories: ["authorization"]          # 任意。authentication / authorization / security
---
```

- `published: true` 以外の記事は生成されない（下書きをそのまま置いておける）
- `targetCategories` に一覧外の値を書くとビルドが失敗する
- `published_at` は Zenn 互換の書式。**設定した記事だけ公開日が表示され、新しい順に並ぶ**。
  未設定の記事は日付を出さず、日付つき記事のあとに slug 順で並ぶ

## 2. 画像を置く

`images/<slug>/<ファイル名>` に置き、Markdown からは絶対パスで参照する。

```markdown
![](/images/mcp-authorization/flow.png)
```

`images/` はビルド時に `packages/web/public/images/` へ同期されるため、
記事中のパスがそのまま配信 URL になる。

## 3. 確認して push

```bash
pnpm --filter @maronn-auth-blog/web dev
```

`main` への push で GitHub Actions がビルドとデプロイを行う。

---

# アーキテクチャ

## ビルドの流れ

```
articles/*.md ──┐
                ├─ prepare-content.mjs ──┬─ src/generated/articles/index.json  (一覧のメタデータ)
images/**  ─────┘                        ├─ src/generated/articles/html/*.html (本文 HTML)
                                         └─ public/images/**                   (画像の同期)
                                                    │
                                                    ▼
                                              astro build  ──▶  dist/  ──▶  Cloudflare Workers
```

`prepare-content.mjs` の責務:

1. frontmatter を js-yaml でパースし、必須項目と `targetCategories` を検証する（不正ならビルドを落とす）
2. `published: true` の記事だけを対象にする
3. 本文を zenn-markdown-html で HTML 化する（`embedOrigin` に embed Worker を渡す）
4. 一覧用のメタデータ（抜粋・トピック・公開日）を作り、公開日の新しい順に並べる
5. `images/` を `packages/web/public/images/` へ同期する

Astro 側は生成物を読むだけで、ビルド時にファイルシステムへ触らない。

## URL 構造

| ページ | URL |
|--------|-----|
| トップ（記事一覧） | `/` |
| 記事一覧の 2 ページ目以降 | `/page/2` |
| 記事詳細 | `/articles/{slug}` |
| カテゴリ別一覧 | `/categories/{authentication\|authorization\|security}` |
| トピック別一覧 | `/topics/{topic}` |
| 検索 | `/search` |
| Atom フィード | `/feed.xml` |
| プライバシーポリシー | `/privacy` |

旧マルチユーザー構成の `/{username}/articles/{slug}` は `public/_redirects` で
`/articles/{slug}` へ 301 転送する。

## 検索

静的サイトなので検索はクライアント側で行う。記事数が少ないため、
一覧のメタデータ（タイトル・トピック・カテゴリ・抜粋）をそのまま `/search` ページに埋め込み、
`SearchResults` islands が絞り込む。サーバーへの問い合わせは発生しない。

記事本文は索引に含まれないため、本文中の語では検索できない。
記事数が増えて本文検索が必要になったら、専用の索引ファイルを生成する方式に切り替える。

## 埋め込みコンテンツ (embed)

`zenn-markdown-html` が生成する埋め込み iframe の配信元。`PUBLIC_EMBED_ORIGIN` で指定する。

### embed サーバーが不要なサービス

`zenn-markdown-html` が外部サービスの iframe URL に直接変換するため、対応は不要。

- YouTube / StackBlitz / SpeakerDeck / CodePen / CodeSandbox

### embed サーバーが必要なサービス

| エンドポイント | 用途 | 実装方針 |
|----------------|------|----------|
| `/tweet` | X（旧 Twitter）ポスト | oEmbed API で公式埋め込みを取得 |
| `/gist` | GitHub Gist | 公式埋め込みスクリプトを使用 |
| `/github` | GitHub ファイル/コード | カスタム実装（公式埋め込みなし） |
| `/card` | 一般 URL のリンクカード | OGP を取得してカード表示 |
| `/mermaid` | Mermaid 図 | クライアント側でレンダリング |

**公式埋め込みを優先する**。独自 HTML でのレンダリングは公式埋め込みがない場合のみ。

記事詳細ページには iframe の高さ調整用の `postMessage` リスナーを置いている
（zenn の `listen-embed-event.js` 相当）。embed 側の仕様を変えるときは両方を合わせること。

---

# 実装規約

## テスト駆動開発 (TDD)

```
1. Red: 失敗するテストを書く
2. Green: テストが通る最小限のコードを書く
3. Refactor: コードを整理する（テストは通ったまま）
```

- テストファイルは対象と同じ階層に置く（`prepare-content.mjs` → `prepare-content.test.mjs`）
- **コンテンツパイプラインの純粋関数は単体テスト必須**。frontmatter の解釈と記事の並び順は
  記事の見え方を直接左右するため、仕様を変えるときは必ずテストから書く
- 見た目だけのコンポーネントに無理にテストを書かない

## レイヤーの責務

| ディレクトリ | 責務 |
|--------------|------|
| `scripts/` | ビルド時のコンテンツ変換。Node API を使ってよい唯一の場所 |
| `src/lib/` | 生成物の読み出しと整形。副作用を持たない |
| `src/pages/` | ルーティングとページ組み立て。`getStaticPaths` で全ページを列挙する |
| `src/layouts/` | ページ間で共通する枠 |
| `src/islands/` | 表示と操作。データ取得は行わない |

`src/pages` と `src/layouts` は `src/lib` に依存してよいが、逆はしない。

## 型・バリデーション

- `any` 禁止。外部から来る値は `unknown` で受けて絞り込む
- frontmatter の検証は `prepare-content.mjs` に集約する。**不正な記事はビルドを失敗させる**
  （壊れた記事を公開してしまうより、デプロイを止めるほうがよい）
- 型の命名は `ArticleMeta` のように PascalCase

## コード規約

| 対象 | 規則 | 例 |
|------|------|-----|
| 変数・関数 | camelCase | `articlesByTopic` |
| クラス・型 | PascalCase | `ArticleMeta` |
| ファイル（コンポーネント以外） | kebab-case | `target-categories.ts` |
| React コンポーネント | PascalCase | `ArticleList.tsx` |
| 定数 | SCREAMING_SNAKE_CASE | `ARTICLES_PER_PAGE` |
| 環境変数 | SCREAMING_SNAKE_CASE | `PUBLIC_SITE_URL` |

インポート順序: 外部パッケージ → 相対パス（遠い順）→ 型インポート。

## React 規約

### useEffect の禁止

**`useEffect` によるデータ取得は禁止。**

全ページが静的生成されるため、表示に必要なデータはビルド時に確定している。
データは props で渡し、`useState` はユーザー操作による状態変更にのみ使う。

```tsx
// ❌ Bad: クライアントで取りに行く
useEffect(() => { fetch('/api/articles').then(/* ... */); }, []);

// ✅ Good: ビルド時に確定した値を props で受け取る
export default function ArticleList({ articles }: { articles: ArticleMeta[] }) { /* ... */ }
```

### hydrate は必要なものだけ

`client:*` を付けないコンポーネントはビルド時に HTML へ変換され、JavaScript を送らない。
記事一覧・ページャ・カテゴリ一覧のようにリンクを並べるだけの部品には `client:*` を付けないこと。

`client:only="react"` を使う場合はブラウザでしか描画されないため、
`window.location` をレンダリング中に読んでよい（`/search` がこの形）。

## Astro レンダリング戦略

`output: 'static'` で全ページを静的生成する。SSR は使わない。

理由:

- 記事はリポジトリ内のファイルであり、push 以外で内容が変わらない
- 認証もユーザーごとの出し分けもない
- 静的アセット配信のみになるため、実行時のエラー要因と運用コストが小さい

新しいページを追加するときは `getStaticPaths` で生成対象を列挙する。
クエリパラメータはビルド時に解決できないため、絞り込みはパス（`/topics/{topic}` など）で表現する。

---

## Git 規約

### ブランチ戦略

```
main          # 本番環境。push で自動デプロイ
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
| post | 記事の追加・更新 |
| style | フォーマット（コード変更なし） |
| refactor | リファクタリング |
| test | テスト追加・修正 |
| chore | ビルド、設定等 |

## ログ出力

ビルドスクリプトは処理の区切りで `[content]` プレフィックス付きの進捗を出す。
エラーは握りつぶさず、原因のファイル名を含めて throw する。

---

# 注意事項

## セキュリティ

- サイトに認証機能はない。**投稿権限 = このリポジトリへの push 権限**なので、
  リポジトリの権限設定とブランチ保護が実質的なアクセス制御になる
- 記事に API キーやトークンを書かない。公開リポジトリの Markdown はそのまま世界に出る
- 埋め込みの取得先 URL は `packages/embed/src/utils/security.ts` で検証する。
  ここを緩めると SSRF の入口になるため、対象サービスを増やすときは必ず許可リストで絞る

## パフォーマンス

- 全ページ静的生成 + 静的アセット配信のため、実行時のデータ取得はない
- `client:*` の付けすぎは配信する JavaScript を増やす。既定は「付けない」
- 画像は最適化せずそのまま配信している。大きい画像は追加前に縮小しておくこと

## コンテンツ

- 記事の追加・更新はすべて Markdown の編集と push で完結する。管理画面はない
- `articles/` のファイル名を変えると URL が変わる。公開済み記事の slug は変更しない
- 記事を非公開にしたいときは削除せず `published: false` にする
