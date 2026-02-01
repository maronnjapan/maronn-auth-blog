# Cloudflare R2 署名付きURL設定ガイド

このドキュメントでは、署名付きURLを使用した画像アップロード機能の設定方法を説明します。

## 概要

署名付きURL（Pre-signed URL）を使用することで、クライアントから直接R2にファイルをアップロードできます。これにより：

- サーバーを経由しないため、アップロードが高速化
- サーバーのメモリ使用量を削減
- 大きなファイルのアップロードにも対応可能

## セキュリティモデル

| 操作 | アクセス方法 |
|------|-------------|
| 読み取り（画像の取得） | 公開URL（Workers経由） - 誰でもアクセス可能 |
| 書き込み（画像のアップロード） | 署名付きURLのみ - 認証済みユーザーのみ |

## 設定手順

### 1. R2 APIトークンの作成

1. [Cloudflare ダッシュボード](https://dash.cloudflare.com/)にログイン
2. 左メニューから「R2 Object Storage」を選択
3. 「Manage R2 API Tokens」をクリック
4. 「Create API token」をクリック

#### トークンの設定

- **Token name**: `maronn-auth-blog-upload`（任意の名前）
- **Permissions**:
  - **Object Read & Write** を選択
- **Specify bucket(s)**:
  - 「Apply to specific buckets only」を選択
  - `maronn-auth-blog-images` を選択
- **TTL**: 必要に応じて設定（無期限でも可）

5. 「Create API Token」をクリック
6. 表示される以下の情報を控えておく：
   - **Access Key ID**
   - **Secret Access Key**

> **重要**: Secret Access Keyは一度しか表示されません。必ず安全な場所に保存してください。

### 2. アカウントIDの確認

1. Cloudflare ダッシュボードの右側サイドバーで「Account ID」を確認
2. または、R2の「Overview」ページでも確認可能

### 3. 環境変数の設定

#### ローカル開発環境（.dev.vars）

`packages/api/.dev.vars` に以下を追加：

```
# R2 S3 Compatible API (for signed URLs)
R2_ACCOUNT_ID=your-cloudflare-account-id
R2_ACCESS_KEY_ID=your-r2-access-key-id
R2_SECRET_ACCESS_KEY=your-r2-secret-access-key
R2_BUCKET_NAME=maronn-auth-blog-images
```

#### 本番環境（Cloudflare Workers Secrets）

```bash
# wranglerを使用してシークレットを設定
wrangler secret put R2_ACCOUNT_ID --env production
wrangler secret put R2_ACCESS_KEY_ID --env production
wrangler secret put R2_SECRET_ACCESS_KEY --env production
wrangler secret put R2_BUCKET_NAME --env production
```

各コマンド実行後、プロンプトで値を入力してください。

### 4. R2バケットの公開設定（読み取り用）

現在の設定では、読み取りはWorkers経由で行われるため、R2バケット自体を公開する必要はありません。

もしR2の公開URLを直接使用したい場合は：

1. R2バケットの設定ページを開く
2. 「Settings」タブを選択
3. 「Public access」で「Allow Access」を有効化
4. カスタムドメインを設定（オプション）

> **注意**: 公開設定は読み取りのみに適用されます。書き込みには常に認証が必要です。

## APIエンドポイント

### アバター画像のアップロード

#### 1. 署名付きURLの取得

```bash
POST /avatars/upload-url
Content-Type: application/json
Authorization: Bearer <token>

{
  "filename": "avatar.png",
  "contentType": "image/png",
  "contentLength": 102400
}
```

レスポンス:
```json
{
  "uploadUrl": "https://xxx.r2.cloudflarestorage.com/...",
  "key": "avatars/user123/1234567890.png",
  "expiresIn": 300,
  "publicUrl": "https://images.example.com/avatars/user123/1234567890.png"
}
```

#### 2. 署名付きURLへのアップロード

```bash
PUT <uploadUrl>
Content-Type: image/png
Content-Length: 102400

<binary data>
```

#### 3. アップロード完了の確認

```bash
POST /avatars/confirm
Content-Type: application/json
Authorization: Bearer <token>

{
  "key": "avatars/user123/1234567890.png"
}
```

レスポンス:
```json
{
  "avatarUrl": "https://images.example.com/avatars/user123/1234567890.png"
}
```

### コメント画像のアップロード

#### 1. 署名付きURLの取得

```bash
POST /comments/images/upload-url
Content-Type: application/json
Authorization: Bearer <token>

{
  "filename": "screenshot.png",
  "contentType": "image/png",
  "contentLength": 204800
}
```

レスポンス:
```json
{
  "uploadUrl": "https://xxx.r2.cloudflarestorage.com/...",
  "key": "comment-images/user123/uuid.png",
  "expiresIn": 300,
  "publicUrl": "https://images.example.com/comment-images/user123/uuid.png"
}
```

#### 2. 署名付きURLへのアップロード

```bash
PUT <uploadUrl>
Content-Type: image/png
Content-Length: 204800

<binary data>
```

## クライアント側の実装例

```typescript
async function uploadImage(file: File, type: 'avatar' | 'comment'): Promise<string> {
  // 1. 署名付きURLを取得
  const endpoint = type === 'avatar'
    ? '/avatars/upload-url'
    : '/comments/images/upload-url';

  const urlResponse = await fetch(`${API_URL}${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      filename: file.name,
      contentType: file.type,
      contentLength: file.size,
    }),
  });

  const { uploadUrl, key, publicUrl } = await urlResponse.json();

  // 2. 署名付きURLにアップロード
  await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': file.type,
      'Content-Length': String(file.size),
    },
    body: file,
  });

  // 3. アバターの場合は確認API呼び出し
  if (type === 'avatar') {
    await fetch(`${API_URL}/avatars/confirm`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ key }),
    });
  }

  return publicUrl;
}
```

## 制限事項

| 画像タイプ | 最大サイズ | 許可形式 |
|-----------|-----------|---------|
| アバター | 2 MB | JPEG, PNG, WebP |
| コメント画像 | 3 MB | JPEG, PNG, WebP, GIF |

## トラブルシューティング

### 署名付きURLの取得でエラーが発生する

- R2 APIトークンの権限を確認してください
- 環境変数が正しく設定されているか確認してください
- アカウントIDが正しいか確認してください

### アップロードが失敗する

- Content-TypeとContent-Lengthが正しく設定されているか確認
- 署名付きURLの有効期限（5分）が切れていないか確認
- ファイルサイズが制限を超えていないか確認

### CORSエラーが発生する

R2バケットのCORS設定を確認してください：

1. R2バケットの設定ページを開く
2. 「Settings」タブを選択
3. 「CORS Policy」を設定

```json
[
  {
    "AllowedOrigins": ["https://your-frontend-domain.com"],
    "AllowedMethods": ["GET", "PUT"],
    "AllowedHeaders": ["*"],
    "MaxAgeSeconds": 3600
  }
]
```
