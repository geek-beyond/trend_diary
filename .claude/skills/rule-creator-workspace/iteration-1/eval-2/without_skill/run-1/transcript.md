# transcript: テストでの外部API実通信禁止ルールの作成

## タスク

テストファイル（`*.test.ts`）では外部APIへの実通信を禁止してモックする、という規約を追加する。テストファイルにだけ効くようにする。

## 手順

1. リポジトリ構成と既存ルールの確認
   - `/home/user/trend_diary/.claude/rules/` 配下に既存ルールが5件存在することを確認。
   - 各ルールが YAML frontmatter の `paths`（globパターン）でスコープを限定し、本文を日本語markdownで記述する形式であることを把握。
2. 既存のテストルール `test.md` を確認
   - frontmatter は `paths: - "**/*.test.ts"`。本文はテーブル駆動テストに関する内容で、外部API通信の話題は未記載。
   - 関心が異なるため、本タスクは `test.md` への追記ではなく独立したルールファイルとして作成する方針とした。
3. 実際のテストコードでの外部API扱いを調査
   - `*.test.ts` 内で `vi.mock` / `vi.fn` / `vi.stubGlobal` / `fetch` 等を検索。
   - 代表例として以下を精読:
     - `application/packages/notification/src/discord.test.ts`
     - `application/packages/cron/src/fetch-articles.test.ts`
   - いずれも `const fetchMock = vi.fn()` を `vi.stubGlobal('fetch', fetchMock)` で差し替え、`mockResolvedValueOnce` / `mockRejectedValueOnce` でレスポンスを与え、通信しないケースは `expect(...).not.toHaveBeenCalled()` で検証する idiom を採用。
4. テストフレームワーク・モックライブラリの確認
   - 全パッケージの `package.json` を確認。テストは Vitest を使用。
   - `msw` / `nock` / `undici` のモック系ライブラリは未導入であることを確認。ルール文面はリポジトリの実態（Vitest + `vi.stubGlobal`）に合わせた。

## 参照ファイル

- `/home/user/trend_diary/.claude/rules/test.md`（frontmatter形式・スコープの参考）
- `/home/user/trend_diary/.claude/rules/api-validation.md`, `import.md`, `logging.md`, `architecture.md`（ルール記述スタイルの参考）
- `/home/user/trend_diary/application/packages/notification/src/discord.test.ts`（fetchモックの実例）
- `/home/user/trend_diary/application/packages/cron/src/fetch-articles.test.ts`（fetchモックの実例）
- 各 `application/packages/*/package.json`（テストフレームワーク／モックライブラリの確認）

## 置き場所の判断理由

- 制約により実リポジトリ（`.claude/rules/` や `CLAUDE.md`）は変更不可のため、成果物は指定された
  `.../eval-2/without_skill/run-1/outputs/` にのみ書き込んだ。
- 本来このルールは、既存ルールと同じく `/home/user/trend_diary/.claude/rules/` 配下に
  `test-external-api-mock.md` として配置する想定（CLAUDE.md に常時載せるほどではなく、テストファイル種別に閉じた指示のため、
  paths スコープ付きルールファイルが適切）。
- ファイル名は内容を表す `test-external-api-mock.md` とした。既存 `test.md` とは関心（テーブル駆動 vs 外部通信モック）が
  異なるため別ファイルに分離した。

## 最終ファイルの要点

- ファイル: `outputs/test-external-api-mock.md`
- frontmatter: `paths: - "**/*.test.ts"` により、テストファイルにだけ効く。
- 本文の要点:
  - テストでの外部API実通信を禁止し、必ずモックする（理由: flaky/低速化・外部副作用の回避）。
  - 対象は `fetch` 等のHTTP通信・Webhook送信・外部フィード取得などプロセス外通信全般。
  - モックは Vitest を使用（`msw`/`nock` 未導入）。`vi.stubGlobal('fetch', vi.fn())` で差し替え、
    `mockResolvedValueOnce` / `mockRejectedValueOnce` で成功・失敗を検証、通信しないケースは
    `not.toHaveBeenCalled()` で確認、`beforeEach` でモックをリセット。
  - DI 可能な場合はクライアントのモック注入でもよい（いずれにせよ実ネットワーク到達は不可）。
  - 参考実装として discord.test.ts / fetch-articles.test.ts を明記。
