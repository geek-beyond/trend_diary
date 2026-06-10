# transcript: rule-creator 実行記録（eval-2 / with_skill / run-1）

## タスク

「テストファイル（*.test.ts）では外部APIへの実通信を禁止してモックする、という規約を追加したい。テストファイルにだけ効くようにする。」

## 手順

1. スキル `/home/user/trend_diary/.claude/skills/rule-creator/SKILL.md` を読み、手順に従った。
2. 既存ルールを確認（`ls .claude/rules/`）。
3. 同テーマの既存ファイル `test.md` を読み、追記対象として妥当か判断。
4. 対象 glob の妥当性を確認するため、実リポジトリのテストファイル拡張子を調査。
5. リポジトリ既存のモック作法（Vitest）を確認し、本文の「方法」に反映。
6. 既存 `test.md` の完成形（追記後）を outputs に書き出した。実リポジトリのファイルは変更していない。

## 参照ファイル（確認結果）

- `.claude/rules/` の一覧: `api-validation.md` / `architecture.md` / `import.md` / `logging.md` / `test.md`
- `.claude/rules/test.md`（既存）:
  - フロントマター `paths: ["**/*.test.ts"]` で、まさに今回の対象スコープ（テストファイル限定）が既に設定済み。
  - 本文は「テスト規約」見出しで、テーブル駆動テストの方針を箇条書き＋ネストの「理由」「注意」で記載。
- `.claude/rules/architecture.md` / `api-validation.md`: 文体・構成（`# 〇〇規約`、箇条書き、ネストで理由・代替案）を作法確認のため参照。
- 実リポジトリのテストファイル: `find application -name "*.test.ts"` で多数ヒット。`*.test.tsx` は 0 件。よって `paths: ["**/*.test.ts"]` で過不足なし（`.tsx` 追加は不要）。
- 既存モック作法: `application/packages/notification/src/discord.test.ts` で `vi.fn()` + `vi.stubGlobal('fetch', mockFetch)` を使用。Vitest 前提と判明したため、規約本文の「方法」に `vi.stubGlobal` / `vi.mock` を明記。

## 新規作成か既存追記かの判断理由

**既存 `test.md` への追記**を選択。

- 今回の規約は「テスト方針」というトピックで、既存 `test.md` と同一テーマ。
- 既存 `test.md` の `paths` が `**/*.test.ts` で、要件「テストファイルにだけ効く」と完全一致。新規ファイルを作ると同一スコープのルールが分散し、スキルの「既存ファイルへの追記を優先（規約の分散を防ぐ）」「重複・矛盾する別ファイルを増やさない」方針に反する。
- したがって新規ファイルは作らず、`test.md` に1項目追記した完成形を1ファイルとして出力。

## paths の決定

- `paths: ["**/*.test.ts"]`（既存のまま維持）。
- 根拠: 実リポジトリに `*.test.tsx` が存在しない（0 件）ことを `find` で確認。全テストは `.test.ts`。よって当て推量で `.tsx` を足さず、過不足のない既存 glob をそのまま採用。
- `paths` があることで、Claude が `*.test.ts` を読むときだけこの規約がコンテキストに載る＝「テストファイルにだけ効く」要件を満たす。

## 最終ファイルの要点（outputs/test.md）

- 既存のテーブル駆動テスト項目はそのまま残し、新規項目を1つ追記。
- 追記内容: 「外部APIへの実通信は禁止し、必ずモックする」
  - 理由: 実通信は flaky・レート制限・課金・副作用を招き、テストの決定性/再現性/速度を損なうため。
  - 方法: Vitest の `vi.stubGlobal('fetch', vi.fn())` / `vi.mock()` で外部呼び出しを差し替え、レスポンス・エラーをテスト側で制御。
- 文体は日本語＋敬体寄りの簡潔な箇条書き、`# テスト規約` 見出し、理由をネストで添える既存作法に準拠。why を明記し、理由なき MUST の羅列を避けた。

## 制約遵守

- 実リポジトリ（`.claude/rules/`、`CLAUDE.md` 等）は未変更。git commit / push は未実施。
- 成果物は outputs ディレクトリ、記録は transcript.md のみに書き込み。
