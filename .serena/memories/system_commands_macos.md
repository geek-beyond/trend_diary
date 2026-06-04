# macOS（Darwin）システムコマンド

## 基本的なUnixコマンド

macOSはBSD派生のため、一部のコマンドがLinuxと異なる挙動を示す場合がある。

### ファイル・ディレクトリ操作
```bash
# ディレクトリ一覧
ls
ls -la          # 詳細表示（隠しファイル含む）

# ディレクトリ移動
cd /path/to/dir

# ファイル検索
find . -name "*.ts"
find . -type f -name "pattern"

# ファイル内容検索
grep "pattern" file.txt
grep -r "pattern" ./src     # 再帰的検索
```

### Git操作
```bash
# ステータス確認
git status

# 差分確認
git diff
git diff --staged

# コミット
git add .
git commit -m "feat: add feature"

# プッシュ
git push

# ログ確認
git log
git log --oneline
```

### プロセス管理
```bash
# プロセス一覧
ps aux

# ポート使用状況確認
lsof -i :3000

# プロセス終了
kill <pid>
kill -9 <pid>      # 強制終了
```

### Docker（OrbStack推奨）
```bash
# コンテナ一覧
docker ps
docker ps -a       # 停止中も含む

# コンテナ起動・停止
docker start <container>
docker stop <container>

# Docker Compose
docker compose up
docker compose down
docker compose ps
```

## macOS特有のコマンド

### ファイルシステム
```bash
# ファイルを開く（デフォルトアプリ）
open file.txt
open .             # Finderで開く

# ファイルパスをクリップボードにコピー
pbcopy < file.txt

# クリップボードの内容を出力
pbpaste
```

### システム情報
```bash
# システムバージョン
sw_vers

# CPU・メモリ情報
sysctl -n machdep.cpu.brand_string
sysctl hw.memsize
```

## 開発環境セットアップコマンド

### 初回セットアップ
```bash
# Nodeモジュールインストール
pnpm install --frozen-lockfile

# Supabase起動
supabase start

# 環境変数設定
cp .dev.vars.example .dev.vars

# DBマイグレーション適用
pnpm run db:migrate

# 開発サーバー起動
pnpm start
```

### 日常的な操作
```bash
# ブランチ切り替え
git checkout -b feature/new-feature

# 変更をステージング
git add .

# コミット（Conventional Commits）
git commit -m "feat: add user authentication"

# テスト実行
pnpm run test:domain
pnpm run test:api

# Lint実行
pnpm run lint
```

## トラブルシューティング

### ポートが使用中の場合
```bash
# ポート3000を使用しているプロセスを確認
lsof -i :3000

# プロセスを終了
kill -9 <pid>
```

### Nodeモジュールのクリーンインストール
```bash
rm -rf node_modules pnpm-lock.yaml
pnpm install --frozen-lockfile
```

### Supabaseのリセット
```bash
supabase stop
supabase start
pnpm run db:reset
```

## macOS BSD vs GNU Linux の主な違い

- `sed`: macOSは BSD sed（`-i` オプションの挙動が異なる）
- `grep`: GNU grep と若干の挙動差異
- `find`: 基本的に同じだが、一部オプションが異なる
- `ls`: カラー表示のオプションが異なる（`--color` vs `-G`）

プロジェクト内ではこれらの違いを意識する必要は通常ない（npm scripts経由で実行）。
