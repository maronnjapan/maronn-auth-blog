#!/usr/bin/env bash
#
# npm Trusted Publisher 半自動ガイドスクリプト
# ------------------------------------------------------------
# クローンしたリポジトリのルートで実行してください。
#
#   ./guide.sh          … 未完了のステップを順番に案内します
#   ./guide.sh menu     … メニューから任意のステップを実行します
#   ./guide.sh reset    … 進捗をリセットします
#
# 対応する工程:
#   0. 前提チェック
#   1. npm Organization の作成        (Web操作の半自動ガイド)
#   2. package.json の name 変更
#   3. 初回 publish
#   4. Trusted Publisher の設定        (Web操作の半自動ガイド)
#   5. CI (publish.yml) の構築
#   6. 動作確認とリリースの案内
# ------------------------------------------------------------

set -uo pipefail

# ---- 設定 --------------------------------------------------
STATE_FILE=".npm-tp-guide-state"          # 完了ステップを記録するファイル
CONFIG_FILE=".npm-tp-guide-config"        # 入力値(ORG/PKG名など)を記録するファイル
WORKFLOW_PATH=".github/workflows/publish.yml"
MIN_NPM_VERSION="11.5.1"                   # Trusted Publisher(OIDC)に必要な npm CLI
MIN_NODE_VERSION="20.0.0"                  # 最低ライン
RECOMMENDED_NODE_VERSION="22.14.0"         # Trusted Publishing 推奨
WORKFLOW_NODE_VERSION="22.x"               # 生成する workflow で使う Node

# ---- 色/装飾 ------------------------------------------------
if [ -t 1 ]; then
  C_RESET="\033[0m"; C_BOLD="\033[1m"; C_DIM="\033[2m"
  C_RED="\033[31m"; C_GREEN="\033[32m"; C_YELLOW="\033[33m"
  C_BLUE="\033[34m"; C_CYAN="\033[36m"
else
  C_RESET=""; C_BOLD=""; C_DIM=""; C_RED=""; C_GREEN=""; C_YELLOW=""; C_BLUE=""; C_CYAN=""
fi

step()  { printf "\n${C_BOLD}${C_BLUE}=== %s ===${C_RESET}\n" "$*"; }
info()  { printf "${C_CYAN}ℹ %s${C_RESET}\n" "$*"; }
ok()    { printf "${C_GREEN}✔ %s${C_RESET}\n" "$*"; }
warn()  { printf "${C_YELLOW}⚠ %s${C_RESET}\n" "$*"; }
err()   { printf "${C_RED}✗ %s${C_RESET}\n" "$*" >&2; }
hint()  { printf "${C_DIM}  %s${C_RESET}\n" "$*"; }

# yes/no 確認。デフォルトは No。
confirm() {
  local prompt="${1:-続行しますか？}"
  printf "${C_BOLD}%s (y/N): ${C_RESET}" "$prompt"
  local answer
  read -r answer
  [ "$answer" != "${answer#[Yy]}" ]
}

# 値の入力。$1=プロンプト, $2=デフォルト値
# プロンプト文字列は stderr に出す(コマンド置換で戻り値に混入させないため)。
# 戻り値(入力値)だけを stdout に出力する。
prompt_value() {
  local prompt="$1" default="${2:-}" answer
  if [ -n "$default" ]; then
    printf "${C_BOLD}%s [%s]: ${C_RESET}" "$prompt" "$default" >&2
  else
    printf "${C_BOLD}%s: ${C_RESET}" "$prompt" >&2
  fi
  if ! read -r answer; then
    printf '%s' "$default"   # EOF: デフォルトを返しつつ失敗を通知
    return 1
  fi
  printf '%s' "${answer:-$default}"
}

pause() {
  printf "${C_DIM}  ↵ Enter を押すと続行します...${C_RESET}"
  read -r _
}

# ---- その場でのコマンド実行 --------------------------------
# 必要なコマンドをガイドの中でそのまま実行するためのヘルパー。
# 実行後は自動的にガイドの続きへ戻ります。
#   run_inline "説明" コマンド [引数...]
# 戻り値: コマンドの終了コード(スキップ時は 1)。
run_inline() {
  local desc="$1"; shift
  info "実行が必要なコマンド: ${C_BOLD}$*${C_RESET}"
  if ! confirm "「$desc」をこの場で実行しますか？(n=別ターミナルで実行)"; then
    warn "「$desc」の実行をスキップしました。別ターミナルで実行後、ガイドにお戻りください。"
    return 1
  fi
  printf '%s\n' "${C_DIM}--- コマンド実行 ($*) ---${C_RESET}"
  "$@"
  local rc=$?
  printf '%s\n' "${C_DIM}--- コマンド終了 (exit=$rc) ---${C_RESET}"
  if [ "$rc" -eq 0 ]; then
    ok "「$desc」が完了しました。ガイドに戻ります。"
  else
    err "「$desc」の実行に失敗しました (exit=$rc)。"
  fi
  return "$rc"
}

# npm へのログインを保証する。未ログインなら npm login をその場で実行する。
# 戻り値: ログイン済みなら 0、失敗/スキップなら 1。
ensure_npm_login() {
  local who
  if who="$(npm whoami 2>/dev/null)"; then
    ok "npm ログイン済み: $who"
    return 0
  fi
  warn "npm にログインしていません。"
  if run_inline "npm login" npm login; then
    if who="$(npm whoami 2>/dev/null)"; then
      ok "npm ログイン済み: $who"
      return 0
    fi
    err "ログイン処理は終了しましたが、まだログイン状態を確認できません。"
  fi
  return 1
}

# ---- 進捗管理 ----------------------------------------------
mark_done() { grep -qxF "$1" "$STATE_FILE" 2>/dev/null || echo "$1" >> "$STATE_FILE"; }
is_done()   { grep -qxF "$1" "$STATE_FILE" 2>/dev/null; }
status_of() { if is_done "$1"; then printf "${C_GREEN}[完了]${C_RESET}"; else printf "${C_DIM}[未完]${C_RESET}"; fi; }

# ---- 設定値の保存/読み込み ---------------------------------
save_config() { # save_config KEY VALUE
  touch "$CONFIG_FILE"
  # 既存の同一キー行を削除してから追記
  if grep -q "^$1=" "$CONFIG_FILE" 2>/dev/null; then
    grep -v "^$1=" "$CONFIG_FILE" > "$CONFIG_FILE.tmp" && mv "$CONFIG_FILE.tmp" "$CONFIG_FILE"
  fi
  echo "$1=$2" >> "$CONFIG_FILE"
}
load_config() { # load_config KEY -> value(stdout)
  [ -f "$CONFIG_FILE" ] || return 0
  grep "^$1=" "$CONFIG_FILE" | tail -n1 | cut -d= -f2-
}

# ---- バージョン比較 (v1 >= v2 で成功) -----------------------
version_ge() {
  [ "$1" = "$2" ] && return 0
  printf '%s\n%s\n' "$2" "$1" | sort -V -C
}

# ============================================================
# Step 0: 前提チェック
# ============================================================
step0_prerequisites() {
  step "Step 0: 前提チェック"
  local failed=0

  # git リポジトリか
  if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    ok "git リポジトリ内で実行しています。"
  else
    err "git リポジトリではありません。クローンしたリポジトリのルートで実行してください。"
    failed=1
  fi

  # Node.js
  if command -v node >/dev/null 2>&1; then
    local nodev; nodev="$(node -v | sed 's/^v//')"
    if version_ge "$nodev" "$RECOMMENDED_NODE_VERSION"; then
      ok "Node.js $nodev (推奨 $RECOMMENDED_NODE_VERSION 以上を満たしています)"
    elif version_ge "$nodev" "$MIN_NODE_VERSION"; then
      warn "Node.js $nodev 。動作はしますが Trusted Publishing は $RECOMMENDED_NODE_VERSION 以上が推奨です。"
    else
      err "Node.js $nodev は古すぎます ($MIN_NODE_VERSION 以上が必要)。"
      failed=1
    fi
  else
    err "node が見つかりません。Node.js をインストールしてください。"
    failed=1
  fi

  # npm CLI
  if command -v npm >/dev/null 2>&1; then
    local npmv; npmv="$(npm -v)"
    if version_ge "$npmv" "$MIN_NPM_VERSION"; then
      ok "npm $npmv (Trusted Publisher に必要な $MIN_NPM_VERSION 以上を満たしています)"
    else
      warn "npm $npmv 。Trusted Publisher の OIDC publish には $MIN_NPM_VERSION 以上が必要です。"
      if run_inline "npm の更新" npm install -g npm@latest; then
        npmv="$(npm -v)"
        version_ge "$npmv" "$MIN_NPM_VERSION" && ok "npm $npmv に更新しました。"
      fi
    fi
  else
    err "npm が見つかりません。"
    failed=1
  fi

  # GitHub CLI (設定値の自動取得に使用)
  if command -v gh >/dev/null 2>&1; then
    if gh auth status >/dev/null 2>&1; then
      ok "GitHub CLI 認証済み。"
    else
      warn "GitHub CLI は未認証です。設定値の自動取得には認証が便利です。"
      run_inline "gh auth login" gh auth login && gh auth status >/dev/null 2>&1 && ok "GitHub CLI 認証済み。"
    fi
  else
    warn "GitHub CLI (gh) が未インストールです。Trusted Publisher の設定値を手入力する必要があります。"
    hint "インストール: https://cli.github.com/"
  fi

  # npm ログイン(未ログインなら その場で npm login を実行できます)
  ensure_npm_login || warn "初回 publish と Organization 作成前に npm ログインが必要です。"

  if [ "$failed" -ne 0 ]; then
    err "必須の前提が満たされていません。上記を解消してから再実行してください。"
    return 1
  fi

  mark_done step0
  ok "前提チェック完了。"
}

# ============================================================
# Step 1: npm Organization の作成 (Web操作の半自動ガイド)
# ============================================================
step1_create_org() {
  step "Step 1: npm Organization の作成"
  cat <<'EOS'
Trusted Publisher を実運用に近い形で試すため、パッケージを Organization スコープ
(@org-name/package-name) で公開します。そのスコープの前提として npm Organization が必要です。
（元の手順書ではこの工程が抜けていましたが、スコープ付きパッケージには必須です）

Organization の作成は npm の Web UI 操作でのみ完結します(CLI では作成できません)。
以下の手順で作成してください。
EOS

  info "1. 次の URL をブラウザで開きます:"
  printf "   ${C_BOLD}${C_CYAN}https://www.npmjs.com/org/create${C_RESET}\n"
  hint "(ログインしていない場合は https://www.npmjs.com/login からログイン)"
  info "2. Organization 名を入力します。これがそのままパッケージの scope になります。"
  info "3. 料金プランは 'Free'(Unlimited public packages) を選択します。"
  info "4. (任意)メンバーを招待し、Create をクリックします。"
  echo

  local suggested; suggested="$(load_config ORG)"
  local org
  org="$(prompt_value "作成した(する) Organization 名を入力してください" "${suggested:-}")"
  if [ -z "$org" ]; then
    err "Organization 名が空です。中断します。"
    return 1
  fi
  # 先頭の @ を除去して正規化
  org="${org#@}"
  save_config ORG "$org"

  echo
  info "ブラウザ操作支援AI(Claude in Chrome 等)に任せる場合は、以下のプロンプトをコピーして渡してください:"
  printf "${C_DIM}--- ここから ---${C_RESET}\n"
  cat <<EOS
https://www.npmjs.com/org/create を開き、Organization 名に "$org" を入力し、
料金プランは Free (Unlimited public packages) を選択して Organization を作成してください。
作成後、https://www.npmjs.com/org/$org が表示されることを確認してください。
入力や作成の最終確定(Create ボタン)は私(人間)が行うので、そこで一度止めてください。
EOS
  printf "${C_DIM}--- ここまで ---${C_RESET}\n"
  echo

  # 検証(可能なら)
  info "作成できたら検証します。"
  if command -v npm >/dev/null 2>&1 && npm org ls "$org" >/dev/null 2>&1; then
    ok "Organization '$org' を確認できました。"
  else
    warn "CLI からは自動確認できませんでした(権限や CLI バージョンによります)。"
    hint "ブラウザで https://www.npmjs.com/org/$org が表示されれば作成成功です。"
    if ! confirm "Organization '$org' を作成できましたか？"; then
      err "未作成のため中断します。作成後に再実行してください。"
      return 1
    fi
  fi

  mark_done step1
  ok "Organization '$org' の準備が完了しました。"
}

# ============================================================
# Step 2: package.json の name 変更
# ============================================================
step2_rename_package() {
  step "Step 2: package.json の name 変更"

  if [ ! -f package.json ]; then
    warn "package.json が見つかりません。"
    if confirm "最小の package.json を新規作成しますか？"; then
      npm init -y >/dev/null 2>&1
      ok "package.json を作成しました。"
    else
      err "package.json が必要です。中断します。"
      return 1
    fi
  fi

  local org; org="$(load_config ORG)"
  if [ -z "$org" ]; then
    org="$(prompt_value "Organization 名(scope)を入力してください")"
    org="${org#@}"
    save_config ORG "$org"
  fi

  local current_name; current_name="$(npm pkg get name 2>/dev/null | tr -d '"')"
  info "現在の name: ${current_name:-(未設定)}"

  local default_pkg; default_pkg="$(load_config PKG)"
  if [ -z "$default_pkg" ]; then
    # 現在名から scope を除いた部分をデフォルトに
    default_pkg="${current_name##*/}"
    [ "$default_pkg" = "null" ] && default_pkg=""
  fi
  local pkgname
  pkgname="$(prompt_value "パッケージ名(scope なし)を入力してください" "${default_pkg:-my-package}")"
  save_config PKG "$pkgname"

  local full_name="@${org}/${pkgname}"
  info "新しい name: ${C_BOLD}${full_name}${C_RESET}"

  # version が未設定/不正なら 0.0.1 を提案
  local ver; ver="$(npm pkg get version 2>/dev/null | tr -d '"')"
  if [ -z "$ver" ] || [ "$ver" = "null" ]; then
    ver="0.0.1"
    info "version が未設定のため $ver を設定します。"
  else
    info "現在の version: $ver"
  fi

  if confirm "package.json を name=$full_name / version=$ver に更新しますか？"; then
    npm pkg set name="$full_name" >/dev/null
    npm pkg set version="$ver" >/dev/null
    # スコープ付きパッケージを公開するため publishConfig.access=public を明示
    npm pkg set publishConfig.access="public" >/dev/null
    ok "package.json を更新しました。"
    info "現在の設定:"
    npm pkg get name version publishConfig.access 2>/dev/null | sed 's/^/    /'
    save_config FULLNAME "$full_name"
    mark_done step2
  else
    warn "更新をキャンセルしました。"
    return 1
  fi
}

# ============================================================
# Step 3: 初回 publish
# ============================================================
step3_first_publish() {
  step "Step 3: 初回 publish"
  cat <<'EOS'
Trusted Publisher はパッケージが npm 上に存在していることを前提に設定します。
そのため、まず1回だけ手元(あなたのアカウント)から publish してパッケージを作成します。
(2回目以降は CI から token なしで publish できるようになります)
EOS

  local full_name; full_name="$(load_config FULLNAME)"
  [ -z "$full_name" ] && full_name="$(npm pkg get name 2>/dev/null | tr -d '"')"

  info "package.json の内容(name/version)を確認します:"
  npm pkg get name version 2>/dev/null | sed 's/^/    /'

  info "npm ログイン状態を確認します..."
  if ! ensure_npm_login; then
    err "npm ログインが完了していないため中断します。ログイン後に再実行してください。"
    return 1
  fi

  echo
  warn "これは実際に npm に公開する操作です。name とバージョンをよく確認してください。"
  info "実行コマンド: npm publish --access public"
  if confirm "初回 publish を実行しますか？"; then
    if npm publish --access public; then
      ok "publish が完了しました。"
      info "公開ページ: https://www.npmjs.com/package/${full_name}"
      hint "ブラウザで公開を確認したら、次の Trusted Publisher 設定へ進みます。"
      mark_done step3
    else
      err "publish に失敗しました。出力を確認してください。"
      hint "よくある原因: name が既に使われている / scope(Org)へのアクセス権がない / version 重複"
      return 1
    fi
  else
    warn "publish をキャンセルしました。"
    return 1
  fi
}

# ============================================================
# Step 4: Trusted Publisher の設定 (Web操作の半自動ガイド)
# ============================================================
step4_trusted_publisher() {
  step "Step 4: Trusted Publisher の設定"

  local full_name; full_name="$(load_config FULLNAME)"
  [ -z "$full_name" ] && full_name="$(npm pkg get name 2>/dev/null | tr -d '"')"

  # GitHub の owner / repo を取得
  local owner="" repo=""
  if command -v gh >/dev/null 2>&1 && gh auth status >/dev/null 2>&1; then
    owner="$(gh repo view --json owner -q .owner.login 2>/dev/null)"
    repo="$(gh repo view --json name -q .name 2>/dev/null)"
  fi
  if [ -z "$owner" ] || [ -z "$repo" ]; then
    warn "gh から取得できなかったため手入力します。"
    owner="$(prompt_value "GitHub owner (ユーザー名 or Organization)")"
    repo="$(prompt_value "GitHub repository 名")"
  fi
  local workflow_file="publish.yml"

  echo
  info "npm 画面に転記する設定値です:"
  printf "    ${C_BOLD}Package${C_RESET}       : %s\n" "$full_name"
  printf "    ${C_BOLD}GitHub owner${C_RESET}  : %s\n" "$owner"
  printf "    ${C_BOLD}Repository${C_RESET}    : %s\n" "$repo"
  printf "    ${C_BOLD}Workflow file${C_RESET} : %s\n" "$workflow_file"

  echo
  info "設定手順(npm Web UI):"
  printf "   1. パッケージ設定ページを開きます:\n"
  printf "      ${C_BOLD}${C_CYAN}https://www.npmjs.com/package/${full_name}/access${C_RESET}\n"
  hint "(または パッケージページ → Settings タブ)"
  printf "   2. 'Trusted Publisher' セクションで CI/CD プロバイダーに GitHub Actions を選択します。\n"
  printf "   3. 上記の owner / repository / workflow file (%s) を入力します。\n" "$workflow_file"
  printf "   4. 保存し、Trusted Publisher 一覧に追加されたことを確認します。\n"

  echo
  info "ブラウザ操作支援AIに任せる場合のプロンプト:"
  printf "${C_DIM}--- ここから ---${C_RESET}\n"
  cat <<EOS
https://www.npmjs.com/package/${full_name}/access を開き、Trusted Publisher の設定で
CI/CD プロバイダーに GitHub Actions を選択してください。
以下を入力してください:
  - Organization or user: ${owner}
  - Repository: ${repo}
  - Workflow filename: ${workflow_file}
入力後、保存(Save)の最終確定は私(人間)が行うので、そこで一度止めてください。
EOS
  printf "${C_DIM}--- ここまで ---${C_RESET}\n"
  echo

  if confirm "Trusted Publisher の設定を保存できましたか？"; then
    save_config OWNER "$owner"
    save_config REPO "$repo"
    save_config WORKFLOW "$workflow_file"
    mark_done step4
    ok "Trusted Publisher の設定を記録しました。"
  else
    warn "未設定のため、後で再実行してください。"
    return 1
  fi
}

# ============================================================
# Step 5: CI (publish.yml) の構築
# ============================================================
step5_build_ci() {
  step "Step 5: CI (publish.yml) の構築"

  if [ -f "$WORKFLOW_PATH" ]; then
    warn "$WORKFLOW_PATH は既に存在します。"
    if ! confirm "上書きしますか？"; then
      info "既存のファイルを保持します。"
      mark_done step5
      return 0
    fi
  fi

  mkdir -p "$(dirname "$WORKFLOW_PATH")"
  cat > "$WORKFLOW_PATH" <<EOF
name: Publish Package

on:
  release:
    types: [published]

jobs:
  publish:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      id-token: write   # Trusted Publisher の短命トークン発行に必須
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '${WORKFLOW_NODE_VERSION}'
          registry-url: 'https://registry.npmjs.org'
      # Trusted Publisher(OIDC)には新しい npm CLI が必要
      - run: npm install -g npm@latest
      - run: npm ci
      - run: npm publish --provenance --access public
EOF

  ok "$WORKFLOW_PATH を作成しました。"
  info "内容:"
  sed 's/^/    /' "$WORKFLOW_PATH"

  echo
  info "この workflow を GitHub にプッシュします。"
  if confirm "workflow を git commit & push しますか？"; then
    run_inline "git add"    git add "$WORKFLOW_PATH"
    run_inline "git commit" git commit -m "ci: add npm publish workflow"
    run_inline "git push"   git push
  else
    hint "手動で: git add $WORKFLOW_PATH && git commit -m 'ci: add npm publish workflow' && git push"
  fi
  echo
  warn "重要: npm の Trusted Publisher に登録した workflow ファイル名 (publish.yml) と"
  warn "      このファイル名が一致している必要があります。"

  mark_done step5
}

# ============================================================
# Step 6: 動作確認とリリースの案内
# ============================================================
step6_verify() {
  step "Step 6: 動作確認とリリースの案内"

  local full_name; full_name="$(load_config FULLNAME)"
  [ -z "$full_name" ] && full_name="$(npm pkg get name 2>/dev/null | tr -d '"')"

  cat <<'EOS'
CI からの token なし publish を確認します。以下のコマンドはこの場で実行できます。
EOS
  info "1. version を上げます(commit と tag が作られます):"
  if run_inline "npm version patch" npm version patch; then
    info "2. tag を push します:"
    run_inline "git push --follow-tags" git push --follow-tags
  else
    hint "手動で: npm version patch && git push --follow-tags"
  fi

  info "3. GitHub で Release を作成します(publish.yml のトリガーは release: published):"
  if command -v gh >/dev/null 2>&1 && gh auth status >/dev/null 2>&1; then
    local relver; relver="v$(npm pkg get version | tr -d '"')"
    run_inline "gh release create $relver" gh release create "$relver" --generate-notes
  elif [ -n "$(load_config OWNER)" ] && [ -n "$(load_config REPO)" ]; then
    printf "   ${C_CYAN}https://github.com/%s/%s/releases/new${C_RESET}\n" "$(load_config OWNER)" "$(load_config REPO)"
  fi
  info "4. Actions の実行ログで 'npm publish --provenance' の成功を確認します。"
  info "5. npm に新しいバージョンが反映されているか確認します:"
  printf "   ${C_CYAN}https://www.npmjs.com/package/%s${C_RESET}\n" "$full_name"
  echo
  ok "ここまで確認できれば、GitHub Secrets に npm token を置かずに publish できています。"
  mark_done step6
}

# ============================================================
# メニュー / 実行制御
# ============================================================
STEPS=(step0 step1 step2 step3 step4 step5 step6)
declare -A STEP_LABEL=(
  [step0]="前提チェック"
  [step1]="npm Organization の作成"
  [step2]="package.json の name 変更"
  [step3]="初回 publish"
  [step4]="Trusted Publisher の設定"
  [step5]="CI (publish.yml) の構築"
  [step6]="動作確認とリリースの案内"
)
declare -A STEP_FUNC=(
  [step0]=step0_prerequisites
  [step1]=step1_create_org
  [step2]=step2_rename_package
  [step3]=step3_first_publish
  [step4]=step4_trusted_publisher
  [step5]=step5_build_ci
  [step6]=step6_verify
)

print_overview() {
  printf "\n${C_BOLD}npm Trusted Publisher 半自動ガイド${C_RESET}\n"
  local i=0
  for s in "${STEPS[@]}"; do
    printf "  %d. %s  %s\n" "$i" "${STEP_LABEL[$s]}" "$(status_of "$s")"
    i=$((i+1))
  done
}

run_step() { "${STEP_FUNC[$1]}"; }

run_all_pending() {
  print_overview
  for s in "${STEPS[@]}"; do
    if is_done "$s"; then continue; fi
    echo
    if ! confirm "「${STEP_LABEL[$s]}」を実行しますか？(n で終了)"; then
      info "ここまでの進捗は保存されています。'./guide.sh' で続きから再開できます。"
      return 0
    fi
    if ! run_step "$s"; then
      warn "「${STEP_LABEL[$s]}」を完了できませんでした。解消後に再実行してください。"
      return 1
    fi
  done
  echo
  ok "すべてのステップが完了しました 🎉"
}

run_menu() {
  while true; do
    print_overview
    echo
    local choice
    if ! choice="$(prompt_value "実行する番号を入力 (0-6 / q=終了)")"; then
      echo; info "入力が終了(EOF)しました。終了します。"; return 0
    fi
    case "$choice" in
      q|Q) info "終了します。"; return 0 ;;
      [0-6]) run_step "${STEPS[$choice]}" || warn "未完了です。" ;;
      *) warn "0-6 または q を入力してください。" ;;
    esac
    echo
  done
}

reset_progress() {
  rm -f "$STATE_FILE"
  ok "進捗をリセットしました($CONFIG_FILE の入力値は保持しています)。"
  hint "入力値も消す場合: rm -f $CONFIG_FILE"
}

main() {
  touch "$STATE_FILE"
  case "${1:-}" in
    menu)  run_menu ;;
    reset) reset_progress ;;
    ""|run) run_all_pending ;;
    help|-h|--help)
      cat <<'EOS'
使い方:
  ./guide.sh          未完了のステップを順番に案内
  ./guide.sh menu     メニューから任意のステップを実行
  ./guide.sh reset    進捗をリセット
  ./guide.sh help     このヘルプを表示
EOS
      ;;
    *) err "不明な引数: $1"; err "'./guide.sh help' を参照してください。"; return 1 ;;
  esac
}

main "$@"
