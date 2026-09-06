# npm Trusted Publisherで「npm tokenなしpublish」を導入するときに迷う場所をなくす

## このブログの内容について
- Npm Trusted Publisherの概要と、その利点を説明します。
- 合わせて簡単にNPM Trusted Publisherを設定できる手順を説明します。

##　ブログの内容はいいからNpm Trusted Publisherによるライブラリのpublishを実際に試したい方について
以下のコードをクローンしてガイドスクリプトを実行してください。

## 第1章 なぜTrusted Publisherに移行したいのか

### 1-1. はじめに：やりたいことと、避けたいこと

GitHub Actionsからnpmパッケージをpublishしたい場面において、GitHub Secretsに長期のnpm access tokenを配置する運用を避け、Trusted Publisherを利用した移行を検討するケースが増えています。この記事では、概念の説明にとどまらず、初回publishからGitHub Actionsでのpublishまでを実装ベースで通して解説します。

読者の前提として、npmでのinstall経験があり、GitHub Actionsの存在や基本的な構文を理解している方を想定しています。最終的なゴールは、ご自身のパッケージで初回publishからTrusted Publisherの設定、GitHub Actionsでのpublishまでの手順を迷わずに実行できるようになることです。

### 1-2. 静的npm tokenをCIに置くリスク

npm access tokenは、パッケージのpublish権限を持つ重要な資格情報です。これをCI/CDのSecretに長期間配置すると、万が一漏洩した場合、tokenの有効期間中は継続的に悪用されるリスクが伴います。例えば、悪意のあるバージョンのパッケージが意図せずpublishされてしまう可能性があります。

こうしたリスクを軽減するため、必要な時にだけ短命のトークンを発行してpublishするアプローチが推奨されています。

*参考: [npm docs: Creating and viewing access tokens](https://docs.npmjs.com/creating-and-viewing-access-tokens)*

### 1-3. Trusted Publisherとは何か

Trusted Publisherは、GitHub Actions・GitLab CI・CircleCIのいずれかとnpmの間に信頼関係を構築し、CI実行時にのみ短命トークンを利用してpublishを可能にする仕組みです。事前に静的なnpm tokenを保存しておく方式とは異なり、実行時に必要な権限を持つトークンを動的に取得します。これにより、GitHub Secretsにnpm tokenを保存する必要がなくなり、セキュリティ上の懸念を軽減できます。

*参考: [npm docs: Generating provenance statements](https://docs.npmjs.com/generating-provenance-statements)*

### 1-4. Trusted Publisherによるトークン発行の流れ
Trusted Publisherによるトークン発行の流れは以下の図の通りです。

![Trusted Publisherトークン発行の流れ](ここに図形のパスを設定)

---

## 第2章 今回作るものと、半自動ガイドという方針

### 2-1. 今回作るもの

この記事では、以下について説明します。

- サンプルnpmパッケージの構成
- 初回publishガイド
- Trusted Publisher設定方法
- GitHub Actionsのpublish用workflow作成

ただし、説明はいいからとりあえずサンプルパッケージを使ってGitHub Actionsのpublish用workflow作成を行い、CI上で試しにパッケージをpublishしてみたい方用にサンプルのスクリプトを用意しました。
```sh
ガイドスクリプトの実装
```
なので、サクッと試したい方はこちらを活用ください。

## サンプルnpmパッケージの用意
まずは、以下のリポジトリをクローンしてください。

```bash
git clone https://github.com/
```

その後、pakcage.jsonに記載されている@example-maronn-packageを任意の名前に変更してください。

## 第3章 初回publish

### 3-1. 初回publish前に確認すること

Trusted Publisherを設定するには、対象のパッケージが一度npmにpublishされている必要があります。
まずは `package.json` の `name` と `version` が正しく設定されているかを確認します。また、CLI上で `npm login` が完了しているかも事前に確認してください。ここが完了していないと、Trusted Publisherの設定へ進むことができません。

### 3-2. 初回publishを実行し、結果を確認する

ターミナルから初回のnpm publishコマンドを実行します。

```bash
npm publish --access public
```

publishが成功したら、npmのパッケージページにアクセスし、公開されていることを確認します。確認後、次のTrusted Publisher設定へ進みます。

## 第4章 Trusted Publisherを設定する

### 4-1. npm画面でTrusted Publisherを設定する手順

npmのパッケージ設定ページにアクセスし、Trusted Publisherを設定します。（※以下の項目名は執筆時点のnpm画面に基づいています）

1. npmの自パッケージのページを開き、「Settings」タブを選択します。
2. 左側メニューまたはページ内の「Trusted Publishers」などの項目へ移動します。
3. 以下の情報を入力します。
   - GitHub owner
   - GitHub repository
   - Workflow file名（例: `publish.yml`）
4. 設定を保存し、Trusted Publisherがリストに追加されたことを確認します。

## 第5章 GitHub Actionsからnpm tokenなしでpublishする

### 5-1. publish用workflowを書く

GitHub Actionsのworkflowを作成します。`permissions` に `id-token: write` を指定することで、短命トークンを利用する権限を付与します。

```yaml
name: Publish Package
on:
  release:
    types: [published]

jobs:
  publish:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      id-token: write
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20.x'
          registry-url: 'https://registry.npmjs.org'
      - run: npm ci
      - run: npm publish --provenance
```

この設定により、GitHub Secretsに静的なnpm tokenを保存しなくても動作するようになります。

### 5-2. publishを実行して確認する

workflowを作成し、GitHubにプッシュした後、Releaseを作成するなどのトリガー条件を満たしてActionsを実行します。
実行ログを確認し、`npm publish --provenance` が成功してnpm上に新しいバージョンが反映されていることを確認します。

---

## 第6章 まとめと、今回扱わなかったこと

### 6-1. まとめ

CIに長期tokenを配置する運用のリスクと、それを回避するためのTrusted Publisherの導入手順について解説しました。初回publishやnpm画面での設定には一部手作業が残りますが、開くURLや入力値を明示した「半自動ガイド」を用いることで、人間が迷わずに作業でき、AIの支援も受けやすくなります。

### 6-2. 今回扱わなかったこと（発展の入口）

この記事ではスコープ外とした以下のトピックについては、Trusted Publisherによるpublishの基本が整った後に、次のステップとして検討してください。

- version（patch/minor/major）の自動判定やChangelogの自動生成
- GitHub Releaseとの詳細な連携やReleaseブランチ運用
- パッケージ自体のより高度な設計

## 参考資料
- [npm docs: Creating and viewing access tokens](https://docs.npmjs.com/creating-and-viewing-access-tokens)
- [npm docs: Generating provenance statements](https://docs.npmjs.com/generating-provenance-statements)
- [GitHub Actions docs: Publishing Node.js packages](https://docs.github.com/en/actions/publishing-packages/publishing-nodejs-packages)


# リリース手順

このリポジトリの npm publish は **Changesets + GitHub Actions（`.github/workflows/release.yml`）** で自動化されている。
publish は **npm Trusted Publishing (OIDC)** を利用し、長期トークン（`NPM_TOKEN`）を一切持たない構成。

通常のリリース運用（changeset を貯めて Version Packages PR をマージすると publish される二段階フロー）は
`release.yml` 冒頭のコメントを参照。本ドキュメントは **publish を成立させるための初期セットアップ**を扱う。

---

## 全体像

npm の Trusted Publisher は「**そのパッケージが npm 上に既に存在していること**」を前提に設定する。
そのため publish は以下の順序になる。

1. **初回だけ**: ローカルから手動で publish して、パッケージを npm 上に作成する（→ [初回 publish](#初回-publish手動ブートストラップ)）
2. **npm 側で Trusted Publisher を設定する**（→ [Trusted Publisher の設定](#trusted-publisher-の設定次回以降のためのnpm側設定)）
3. **2回目以降**: GitHub Actions の OIDC publish だけで完結する（手動作業不要）

> organization 単位の Trusted Publisher を使える場合は 1 を省略できることがあるが、
> 確実なのはパッケージ単位設定なので、本手順では初回手動 publish を前提にする。

## 初回 publish

各パッケージの **最初の 1 回だけ** ローカルから実行する。

### 前提

- npm アカウントが `@maronn-openid-provider` スコープ（organization）に publish 権限を持っていること
- ローカルの Node / pnpm がリポジトリ指定バージョンであること（`pnpm@10.17.0`）

### 手順

```bash
# 1. npm にログイン（ブラウザ認証 or トークン）
npm login

# 2. 公開状態とバージョンを確認（private:true でないこと、access:public であること）
cat packages/core/package.json   # publishConfig.access = "public" を確認
cat packages/cli/package.json

# 3. クリーンな状態でビルド
pnpm install --frozen-lockfile
pnpm run build

# 4. 各パッケージを publish（スコープ付きなので public 指定が必須）
pnpm --filter @maronn-openid-provider/core publish --access public --no-git-checks
pnpm --filter @maronn-openid-provider/cli  publish --access public --no-git-checks
```

> `--no-git-checks` は「コミットされていない変更があると pnpm publish が止まる」挙動を回避するためのもの。
> 初回発行時のみ利用し、通常リリースは CI に任せるので普段は使わない。

publish 後、npmjs.com に各パッケージのページが作成されていることを確認する。

> 初回手動 publish では provenance（来歴証明）は付かない。provenance は CI の OIDC publish で自動付与される。

---

## Trusted Publisher の設定（次回以降のための npm 側設定）

初回 publish でパッケージが存在する状態になったら、各パッケージに GitHub Actions を信頼させる。
**この設定をすると以降 `NPM_TOKEN` 不要で、CI から短命トークンで安全に publish できる。**

### 手順（パッケージごとに実施）

1. npmjs.com にログインし、対象パッケージページを開く
   - `@maronn-openid-provider/core`
   - `@maronn-openid-provider/cli`
2. **Settings** タブ → **Trusted Publisher**（Publishing access）セクションへ
3. **GitHub Actions** を選び、以下を登録する

   | 項目 | 値 |
   |---|---|
   | Provider | GitHub Actions |
   | Organization / user | `maronnjapan` |
   | Repository | `maronn-openid-provider` |
   | Workflow filename | `release.yml` |
   | Environment | （未使用なので空欄） |

4. 保存する。両パッケージとも同じ内容で登録する。

> Workflow filename は **パスではなくファイル名のみ**（`release.yml`）。
> リポジトリ内の `.github/workflows/release.yml` と一致している必要がある。

### 補足: なぜトークンが要らないのか

- `release.yml` は `permissions.id-token: write` を付与しており、GitHub が発行する OIDC トークンを取得できる。
- npm 側の Trusted Publisher 設定と OIDC トークンの `repository` / `workflow` が一致すると、npm が短命の publish トークンを発行する。
- pnpm 10.17+ がこの OIDC trusted publishing に対応しているため、`changeset publish`（実体は pnpm publish）がそのまま通る。

---

## 2回目以降の通常リリース（参考）

ここまで設定すれば、以降は手動 publish は不要。

1. 機能 PR で `pnpm changeset` を実行し `.changeset/*.md` をコミットして main にマージ
2. Changesets が「Version Packages」PR を自動作成・更新（バージョンと CHANGELOG を集約）
3. リリースしたいタイミングでその PR をマージ → main への push で CI が npm へ publish

詳細は `.github/workflows/release.yml` の冒頭コメントを参照。

---

## トラブルシューティング

| 症状 | 原因 / 対処 |
|---|---|
| CI publish が `404` / `403` で失敗 | パッケージ未作成、または Trusted Publisher 未設定。初回手動 publish と npm 側設定を確認 |
| `Workflow does not match` 系エラー | npm の Trusted Publisher の Workflow filename が `release.yml` と一致しているか確認 |
| `npm publish` がローカルで `private` を理由に止まる | ルート以外の対象パッケージで `private: true` になっていないか確認（公開対象は `core` / `cli`） |
| スコープ付きで `402 Payment Required` | `--access public` 指定漏れ。`publishConfig.access: "public"` も併せて確認 |

---

## トラブルシュート詳細ログ（初回セットアップ時の実録）

上表は要点のみのため、実際に踏んだエラーの詳細と根本原因を時系列で残す。
将来同種の問題が再発した場合の一次情報として、また将来的なブログ化のために記録する。

### 1. PR作成で403エラー

```
Error: GitHub Actions is not permitted to create or approve pull requests.
```

**要因:**
`permissions: pull-requests: write` をワークフローに設定していても、リポジトリ側の
「GitHub Actions が PR を作成・承認することを許可する」設定がデフォルト OFF のため。
ワークフロー内権限とは別レイヤーのガードになっている。

**対処:**
Settings → Actions → General → Workflow permissions →
「Allow GitHub Actions to create and approve pull requests」にチェック

**参考:**
- https://docs.github.com/rest/pulls/pulls#create-a-pull-request

### 2. npm publishで404エラー（1回目・根本原因）

```
Error: 404 Not Found - PUT https://registry.npmjs.org/@scope/pkg
```

**要因:**
GitHub Actions の Node 22 にバンドルされる npm は v10 系で、
npm trusted publishing（OIDC）の要求バージョン（npm >= 11.5.1）を満たさない。
OIDC ハンドシェイクが失敗すると匿名ユーザー扱いになり、認証エラーではなく紛らわしい 404 が返る。

**対処:**
`npm install -g npm@latest`（または具体バージョンにピン留め）のステップを
`setup-node` の直後、`pnpm install` の前に追加する。

**参考:**
- https://github.com/npm/cli/issues/8730
- https://github.com/npm/cli/issues/8976
- https://github.com/npm/cli/issues/8678
- https://medium.com/@kenricktan11/npm-trusted-publishers-the-weird-404-error-and-the-node-js-24-fix-a9f1d717a5dd
- https://docs.npmjs.com/trusted-publishers/

### 3. ERR_PNPM_IGNORED_BUILDS

```
Ignored build scripts: esbuild@0.21.5, esbuild@0.25.12, esbuild@0.27.7, sharp@0.34.5
```

**要因:**
pnpm 10 以降、依存パッケージの postinstall 等の build script を
サプライチェーン攻撃対策としてデフォルトで自動実行しなくなった。
ローカルで `pnpm approve-builds` を実行した結果（`package.json` / `pnpm-workspace.yaml` への書き込み）が
コミット・push されておらず、CI 上のチェックアウトには反映されていなかった。

**対処:**
ローカルで `pnpm approve-builds` → 生成された設定を確認してコミットする
（pnpm 10 系では `package.json` の `pnpm.onlyBuiltDependencies` に反映される）。
pnpm バージョン（`packageManager` フィールド）がローカル / CI で一致しているかも合わせて確認する。

**参考:**
- https://pnpm.io/settings
- https://github.com/pnpm/pnpm/issues/9082（`shared-workspace-lockfile=false` 時の既知の非適用問題）
- https://pnpm.io/blog/releases/11.0（v11 で `onlyBuiltDependencies` → `allowBuilds` へ変更、参考として）

### 4. npm publishで404エラー（2回目・pnpm 11回帰バグ）

```
Error: 404 Not Found（pnpm 11環境下でのOIDC publish）
```

**要因:**
pnpm 11 で publish コマンドが npm CLI 委譲からネイティブ実装に変更され、
それに伴い OIDC trusted publishing が v10 時代と同じに動かず 404 になる既知の回帰バグ。

**対処:**
`packageManager` フィールドを動作実績のある pnpm@10.17.0 系に固定し直す。

**参考:**
- https://github.com/pnpm/pnpm/issues/11513
- https://pnpm.io/blog/releases/11.3（ネイティブ publish 移行の経緯）

### 5. Cannot find module 'sigstore'

```
error an error occurred while publishing @maronn-openid-provider/cli:
MODULE_NOT_FOUND Cannot find module 'sigstore'
```

**要因:**
`npm install -g npm@latest` が、`latest` dist タグの解決タイミングによって
意図せずプレリリース版（12.0.0-pre.2 系）を掴んでしまい、
そのビルドで `libnpmpublish` が依存する `sigstore` モジュール解決が壊れていた。
npm/cli 側の直近の未修正バグ（2026年7月頭に報告）。

**対処:**
`npm@latest` ではなく、正式タグ付けされた安定版を明示的にバージョンピン留めする
（今回は `npm@11.17.0` を指定して解消）。

**参考:**
- https://github.com/npm/cli/issues/9722
- https://github.com/npm/cli/releases（正式リリースタグの確認）

### 最終的な release.yml の該当部分（要点）

```yaml
- name: Setup Node.js
  uses: actions/setup-node@v4
  with:
    node-version: '22'
    cache: 'pnpm'
    registry-url: 'https://registry.npmjs.org'
- name: Update npm to a pinned stable version
  run: npm install -g npm@11.17.0   # latestではなく明示バージョン指定
- name: Install dependencies
  run: pnpm install --frozen-lockfile
```

```jsonc
// package.json
{
  "packageManager": "pnpm@10.17.0", // pnpm11の回帰バグを回避
  "pnpm": {
    "onlyBuiltDependencies": ["esbuild", "sharp"] // 承認結果をコミット
  }
}
```

リポジトリ設定:
Settings → Actions → General → Workflow permissions →
「Allow GitHub Actions to create and approve pull requests」ON
