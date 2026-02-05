/**
 * 検索ワード正規化ユーティリティ
 *
 * 認証・認可、セキュリティに関わる単語を正規化して、
 * 検索ワードのブレをなくす
 */

// 正規化ルール: キーが正規形、値が同義語の配列
const SECURITY_TERM_SYNONYMS: Record<string, string[]> = {
  // 認証関連
  oauth: ['oauth', 'oauth2', 'oauth 2.0', 'oauth2.0'],
  openid: ['openid', 'openid connect', 'oidc'],
  jwt: ['jwt', 'json web token', 'jsonwebtoken'],
  pkce: ['pkce', 'proof key for code exchange'],
  saml: ['saml', 'saml2', 'saml 2.0'],
  sso: ['sso', 'single sign on', 'single sign-on', 'シングルサインオン'],
  mfa: ['mfa', 'multi factor', 'multi-factor', '多要素認証', '2fa', '二要素認証', 'totp', 'hotp'],
  passkey: ['passkey', 'パスキー', 'webauthn', 'fido2', 'fido'],
  session: ['session', 'セッション'],
  cookie: ['cookie', 'cookies', 'クッキー'],
  token: ['token', 'トークン', 'access token', 'アクセストークン', 'refresh token', 'リフレッシュトークン'],

  // 認可関連
  rbac: ['rbac', 'role based access control', 'ロールベースアクセス制御'],
  abac: ['abac', 'attribute based access control', '属性ベースアクセス制御'],
  acl: ['acl', 'access control list', 'アクセス制御リスト'],
  permission: ['permission', 'permissions', 'パーミッション', '権限'],
  scope: ['scope', 'scopes', 'スコープ'],

  // セキュリティ攻撃・脆弱性
  xss: ['xss', 'cross site scripting', 'クロスサイトスクリプティング'],
  csrf: ['csrf', 'cross site request forgery', 'xsrf', 'クロスサイトリクエストフォージェリ'],
  sqli: ['sqli', 'sql injection', 'sqlインジェクション', 'sql インジェクション'],
  injection: ['injection', 'インジェクション'],
  owasp: ['owasp', 'オワスプ'],

  // 暗号化・ハッシュ
  encryption: ['encryption', '暗号化', '暗号'],
  hashing: ['hashing', 'hash', 'ハッシュ', 'ハッシュ化'],
  bcrypt: ['bcrypt', 'ビークリプト'],
  argon2: ['argon2', 'argon 2', 'アルゴン2'],
  sha256: ['sha256', 'sha-256', 'sha 256'],
  aes: ['aes', 'aes256', 'aes-256'],
  rsa: ['rsa', 'rsa暗号'],

  // プロトコル・規格
  https: ['https', 'tls', 'ssl', 'tls/ssl'],
  cors: ['cors', 'cross origin', 'クロスオリジン'],
  csp: ['csp', 'content security policy', 'コンテンツセキュリティポリシー'],
  hsts: ['hsts', 'http strict transport security'],

  // IDプロバイダー
  auth0: ['auth0', 'オースゼロ'],
  okta: ['okta', 'オクタ'],
  cognito: ['cognito', 'amazon cognito', 'aws cognito'],
  firebase_auth: ['firebase auth', 'firebase authentication', 'firebase認証'],
  keycloak: ['keycloak', 'キークローク'],

  // 日本語用語
  認証: ['認証', 'authentication', 'authn'],
  認可: ['認可', 'authorization', 'authz'],
  ログイン: ['ログイン', 'login', 'サインイン', 'sign in', 'signin'],
  ログアウト: ['ログアウト', 'logout', 'サインアウト', 'sign out', 'signout'],
  パスワード: ['パスワード', 'password', 'パスワードレス', 'passwordless'],
  セキュリティ: ['セキュリティ', 'security'],
};

// 逆引きマップを構築（同義語 -> 正規形）
const SYNONYM_TO_NORMALIZED: Map<string, string> = new Map();

for (const [normalized, synonyms] of Object.entries(SECURITY_TERM_SYNONYMS)) {
  for (const synonym of synonyms) {
    SYNONYM_TO_NORMALIZED.set(synonym.toLowerCase(), normalized);
  }
}

/**
 * 単一の検索ワードを正規化する
 * @param term 検索ワード
 * @returns 正規化されたワード
 */
export function normalizeSearchTerm(term: string): string {
  const lowerTerm = term.toLowerCase().trim();

  // 完全一致で正規化
  if (SYNONYM_TO_NORMALIZED.has(lowerTerm)) {
    return SYNONYM_TO_NORMALIZED.get(lowerTerm)!;
  }

  // 部分一致は行わない（意図しない正規化を防ぐ）
  return lowerTerm;
}

/**
 * 検索クエリをトークンに分割する
 * スペース区切りで分割し、各トークンを正規化する
 * @param query 検索クエリ
 * @returns 正規化されたトークンの配列
 */
export function tokenizeAndNormalizeQuery(query: string): string[] {
  // 全角スペースを半角に変換してからスペースで分割
  const tokens = query
    .replace(/　/g, ' ')
    .split(/\s+/)
    .filter((token) => token.length > 0);

  // 各トークンを正規化
  return tokens.map(normalizeSearchTerm);
}

/**
 * FTS5用のAND検索クエリを生成する
 * @param tokens 正規化されたトークン配列
 * @returns FTS5 MATCH用のクエリ文字列
 */
export function buildFtsAndQuery(tokens: string[]): string {
  if (tokens.length === 0) return '';
  if (tokens.length === 1) return tokens[0];

  // FTS5のAND検索: "term1 term2" (スペース区切りでAND)
  return tokens.join(' ');
}

/**
 * FTS5用のOR検索クエリを生成する
 * @param tokens 正規化されたトークン配列
 * @returns FTS5 MATCH用のクエリ文字列
 */
export function buildFtsOrQuery(tokens: string[]): string {
  if (tokens.length === 0) return '';
  if (tokens.length === 1) return tokens[0];

  // FTS5のOR検索: "term1 OR term2"
  return tokens.join(' OR ');
}

/**
 * ハッシュタグ検索の情報
 */
export interface HashtagSearchInfo {
  isHashtagSearch: boolean;
  topics: string[];
}

/**
 * クエリがハッシュタグ検索かどうかを判定する
 * #で始まるトークンがある場合、ハッシュタグ検索とみなす
 * @param query 検索クエリ
 * @returns ハッシュタグ検索の情報
 */
export function detectHashtagSearch(query: string): HashtagSearchInfo {
  // 全角スペースを半角に変換してからスペースで分割
  const tokens = query
    .replace(/　/g, ' ')
    .split(/\s+/)
    .filter((token) => token.length > 0);

  // #で始まるトークンを抽出
  const hashtagTokens = tokens.filter((token) => token.startsWith('#'));

  if (hashtagTokens.length === 0) {
    return { isHashtagSearch: false, topics: [] };
  }

  // #を除去してトピック名を取得
  const topics = hashtagTokens.map((token) => token.slice(1).toLowerCase());

  return {
    isHashtagSearch: true,
    topics: topics.filter((topic) => topic.length > 0),
  };
}

/**
 * 検索クエリを処理して正規化されたAND/ORクエリを返す
 * @param query 元の検索クエリ
 * @returns AND/ORクエリの情報
 */
export interface NormalizedSearchQuery {
  originalQuery: string;
  normalizedTokens: string[];
  andQuery: string;
  orQuery: string;
  isMultiToken: boolean;
  hashtagSearch: HashtagSearchInfo;
}

export function processSearchQuery(query: string): NormalizedSearchQuery {
  const hashtagSearch = detectHashtagSearch(query);
  const normalizedTokens = tokenizeAndNormalizeQuery(query);

  return {
    originalQuery: query,
    normalizedTokens,
    andQuery: buildFtsAndQuery(normalizedTokens),
    orQuery: buildFtsOrQuery(normalizedTokens),
    isMultiToken: normalizedTokens.length > 1,
    hashtagSearch,
  };
}
