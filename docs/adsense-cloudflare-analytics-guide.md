# Google AdSense 申請 & Cloudflare Web Analytics 設定ガイド

自分用の手順メモ。

---

## 目次

- [Part 1: Google AdSense 申請](#part-1-google-adsense-申請)
- [Part 2: Cloudflare Web Analytics 設定](#part-2-cloudflare-web-analytics-設定)

---

# Part 1: Google AdSense 申請

## 1. 申請前の準備チェックリスト

### アカウント要件

- [ ] 18歳以上であること（未満の場合は親のGoogleアカウントが必要）
- [ ] AdSense に未登録の Google アカウントを用意（1人1アカウント制限）
- [ ] サイトの HTML ソースコードを編集できる状態であること

### サイト要件

- [ ] **独自ドメイン**を使用している（`example.com` など。無料サブドメインは信頼度が低い）
- [ ] **HTTPS/SSL** が有効
- [ ] **モバイルレスポンシブ**対応済み
- [ ] ページ読み込み速度が十分（目安: 4秒以内）
- [ ] ナビゲーションが明確で壊れたリンクがない
- [ ] XML サイトマップを Google Search Console に登録済み
- [ ] 他の広告ネットワークを**外しておく**（審査中は他の広告を表示しない）

### コンテンツ要件

- [ ] **15〜25本以上**の高品質な記事（各 1,500文字以上が目安）
- [ ] すべてオリジナルコンテンツ（コピー・純粋なAI生成はNG）
- [ ] 特定のニッチ/テーマに集中している
- [ ] 以下の必須ページを作成済み:
  - [ ] プライバシーポリシー
  - [ ] About（サイト紹介）
  - [ ] お問い合わせ
  - [ ] 利用規約 / 免責事項

### ドメイン年齢

- 3〜6ヶ月以上が望ましい。新しいドメインでもコンテンツが優秀なら通る場合あり。

### トラフィック

- 最低トラフィック要件はない。ただしオーガニックトラフィックがあると有利。
- ボットトラフィックやトラフィック購入は絶対NG（即BAN）。

---

## 2. 申請手順

### Step 1: AdSense にサインアップ

1. https://www.google.com/adsense/start/ にアクセス
2. 「ご利用開始」をクリック
3. Google アカウントでログイン

### Step 2: サイト情報を入力

1. 収益化したいサイトの URL を入力
2. メールアドレスを入力
3. 国/地域を選択
4. アカウントの種類を選択（個人 or ビジネス）
5. 氏名、住所、電話番号を入力

### Step 3: 利用規約に同意

AdSense プログラムポリシーと利用規約を確認して同意。

### Step 4: 確認コードをサイトに設置

AdSense が発行する HTML スニペットをサイトの `<head>` タグ内に追加する。

```html
<script async
  src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-XXXXXXXXXXXXXXXX"
  crossorigin="anonymous"></script>
```

**Astro の場合の設置場所:**

共通レイアウトファイル（例: `layouts/Layout.astro`）の `<head>` 内に追加する。

```astro
---
// src/layouts/Layout.astro
---
<html>
  <head>
    <!-- 他のメタタグ -->
    <script async
      src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-XXXXXXXXXXXXXXXX"
      crossorigin="anonymous"></script>
  </head>
  <body>
    <slot />
  </body>
</html>
```

### Step 5: 審査をリクエスト

AdSense ダッシュボードに戻り、コードを設置したことを確認して「完了」をクリック。

> **注意:** 審査中はコードを削除しないこと。

---

## 3. 審査プロセス

- Google は**AI + 人間のレビュアー**でサイトを評価する
- 評価項目: コンテンツ品質、独自性、ポリシー準拠、サイト構造、ナビゲーション、UX
- 審査期間: **2日〜4週間**（新しいサイトや問題がある場合はさらに長い）
- 結果はメールで通知される

---

## 4. よくある却下理由と対策

| 却下理由 | 対策 |
|----------|------|
| **低品質/不十分なコンテンツ** | 記事を増やす（15〜25本、各1,500字以上）。実用的で深い内容にする |
| **必須ページの欠如** | プライバシーポリシー、About、お問い合わせページを作成。テンプレのコピペはNG |
| **ポリシー違反** | アダルト、暴力、著作権侵害コンテンツを削除。[AdSenseポリシー](https://support.google.com/adsense/answer/48182)を確認 |
| **ナビゲーション不良** | 壊れたリンク修正、ポップアップ削除、すべてのページを公開状態にする |
| **重複アカウント** | 1人1アカウント。既存アカウントを確認・整理 |
| **ドメインが新しすぎる** | 3〜6ヶ月待つ。その間にコンテンツを充実させる |
| **コピー/薄いコンテンツ** | オリジナルで包括的な記事を書く。コピーコンテンツは削除 |
| **不正トラフィック** | オーガニックトラフィックのみ。購入やBotは厳禁 |

### 再申請のポイント

- 却下後 **3〜4週間**待ってから再申請
- 却下理由を確認し、**具体的な改善を行ってから**再申請する
- 何も変えずに再申請しても同じ結果になる

---

## 5. 承認後の広告設置

### 広告ユニットの作成

1. AdSense ダッシュボードにログイン
2. 左サイドバーの「広告」をクリック
3. 「広告ユニットごと」タブ → 「新しい広告ユニット」
4. 広告タイプを選択（ディスプレイ広告、記事内広告、フィード内広告など）
5. サイズ・スタイルをカスタマイズ
6. 「保存」で広告コードを生成
7. コードをサイトの表示したい場所に貼り付け

### 自動広告（Auto Ads）

`<head>` にコードを1つ入れるだけで、Google が自動的に最適な位置に広告を配置する。簡単だが配置の制御は少ない。

### パフォーマンスの良い広告サイズ

- **336x280**（大きいレクタングル）
- **300x250**（レクタングル）
- コンテンツ内、ページ上部に近い位置が効果的

---

## 6. 2025〜2026年の注意点

- **AI生成コンテンツへの厳格化**: 純粋なAI生成コンテンツは高リスク。人間による編集・専門知識の付加が必須
- **E-E-A-T 重視**: Experience（経験）、Expertise（専門性）、Authoritativeness（権威性）、Trustworthiness（信頼性）がますます重要
- **TCF v2.3 準拠**: EU/EEA向けの場合、2026年2月28日までに IAB TCF v2.3 への移行が必要
- **米国州プライバシー法**: テネシー州、ミネソタ州、メリーランド州などの新しいプライバシー法に注意

---

# Part 2: Cloudflare Web Analytics 設定

## 1. Cloudflare Web Analytics とは

- **完全無料**（Free プランでも利用可能）
- **プライバシーファースト**: Cookie、localStorage、IPアドレスによるフィンガープリントを一切使用しない
- Cookie を使わないため**GDPR のバナー表示が不要**
- データは広告に利用されない
- 軽量な JavaScript ビーコンで Performance API を利用
- サイトが Cloudflare を経由していなくても使える

---

## 2. セットアップ手順

### パターン A: Cloudflare を経由しているサイト（自動注入）

1. Cloudflare ダッシュボードにログイン
2. 左サイドバー「アナリティクスとログ」→「Web Analytics」
3. 対象サイトを選択 →「サイトを管理」
4. 「有効にする」を選択
5. Cloudflare がエッジで自動的にビーコンを HTML に注入してくれる（コード変更不要）

> **注意:** レスポンスヘッダーに `Cache-Control: public, no-transform` が含まれている場合、自動注入が失敗する。その場合は手動スニペット方式を使う。

### パターン B: 手動スニペット方式（どのサイトでも使える）

1. Cloudflare ダッシュボードにログイン
2. 「Web Analytics」ページに移動
3. 「サイトを追加」をクリック
4. ホスト名を入力 → 「完了」
5. 生成されたスニペットをコピー

```html
<!-- Cloudflare Web Analytics -->
<script defer
  src='https://static.cloudflareinsights.com/beacon.min.js'
  data-cf-beacon='{"token": "your-unique-token-here"}'></script>
<!-- End Cloudflare Web Analytics -->
```

6. サイトの `</body>` タグの直前に設置

### パターン C: Cloudflare Pages プロジェクト

1. ダッシュボード →「Workers & Pages」
2. 対象プロジェクトを選択
3. 「メトリクス」タブ
4. Web Analytics の「有効にする」をクリック
5. 次回デプロイ時に自動追加される

---

## 3. Astro プロジェクトへの設置例

共通レイアウトファイルの `</body>` 直前に追加する。

```astro
---
// src/layouts/Layout.astro
---
<html>
  <head>
    <!-- メタタグなど -->
  </head>
  <body>
    <slot />

    <!-- Cloudflare Web Analytics -->
    <script defer
      src='https://static.cloudflareinsights.com/beacon.min.js'
      data-cf-beacon='{"token": "your-unique-token-here"}'></script>
  </body>
</html>
```

---

## 4. CSP（Content Security Policy）を使っている場合

以下をホワイトリストに追加する必要がある:

- `script-src`: `https://static.cloudflareinsights.com`
- `connect-src`: `https://cloudflareinsights.com`（`navigator.sendBeacon` 用）

---

## 5. 確認できるメトリクス

### 基本メトリクス

| メトリクス | 説明 |
|-----------|------|
| **Visits（訪問数）** | 外部サイトまたは直接リンクからのページビュー。Cookie を使わず referer ベースで判定 |
| **Page Views（ページビュー）** | 読み込まれたページの総数 |

### パフォーマンスメトリクス

| メトリクス | 説明 |
|-----------|------|
| TTFB | Time to First Byte |
| FCP | First Contentful Paint |
| INP | Interaction to Next Paint |

### ディメンション（データの切り口）

| ディメンション | 説明 |
|---------------|------|
| 国 | 訪問者の国 |
| ホスト | サイトのドメイン |
| パス | ページパス |
| リファラー | 参照元サイト |
| デバイスタイプ | デスクトップ / モバイル / タブレット |
| ブラウザ | Chrome, Safari, Firefox など |
| OS | Windows, macOS, iOS, Android など |

### データ保持期間

- **6ヶ月間**の履歴データにアクセス可能

---

## 6. 設定オプション（Cloudflare 経由サイト向け）

### 注入モード

| モード | 動作 |
|-------|------|
| **有効** | 全訪問者に自動注入（デフォルト） |
| **有効（EU訪問者のデータを除外）** | EU からの訪問者にはスニペットを注入しない |
| **有効（JSスニペット手動設置）** | 自動注入なし。手動でスニペットを設置 |
| **無効** | Web Analytics をオフ |

### ルール（パスごとの制御）

1. 「Web Analytics」→ サイトを管理
2. 「高度なオプション」→「ルールを追加」
3. アクション（有効/無効）とホスト名・パスパターンを指定

例: `/admin/*` のパスだけトラッキングを無効にする、など。

---

## 7. Google Analytics との比較

| 項目 | Cloudflare Web Analytics | Google Analytics (GA4) |
|------|-------------------------|----------------------|
| 料金 | 無料 | 無料（GA4）/ 有料（GA360） |
| Cookie | なし | あり |
| Cookie バナー | 不要 | 必要（GDPR 対象の場合） |
| データの利用 | 広告に使われない | Google 広告エコシステムで利用 |
| イベントトラッキング | なし | あり |
| EC トラッキング | なし | あり |
| データ保持 | 6ヶ月 | 14ヶ月（デフォルト） |
| セットアップ難易度 | 簡単 | やや複雑 |

### Cloudflare Web Analytics が向いているケース

- 無料でプライバシーに配慮したアクセス解析がほしい
- 基本的なトラフィック把握（PV、訪問数、リファラー、デバイス）で十分
- GDPR の Cookie バナーを出したくない
- サイトが既に Cloudflare 上にある

### 向いていないケース

- カスタムイベントトラッキングが必要（ボタンクリック、フォーム送信など）
- EC コンバージョンファネルの分析が必要
- 6ヶ月以上のデータ保持が必要
- 広告プラットフォームとの連携が必要

---

## 参考リンク

- [Google AdSense 公式](https://www.google.com/adsense/start/)
- [AdSense プログラムポリシー](https://support.google.com/adsense/answer/48182)
- [AdSense 承認要件](https://support.google.com/adsense/answer/9724)
- [Cloudflare Web Analytics 公式ドキュメント](https://developers.cloudflare.com/web-analytics/)
- [Cloudflare Web Analytics セットアップ](https://developers.cloudflare.com/web-analytics/get-started/)
