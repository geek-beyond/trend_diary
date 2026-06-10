# transcript: rule-creator 実行ログ

## タスク

client のコンポーネントファイル（`application/packages/web/src/client/components` 配下の `.tsx`）にだけ効く命名規約を追加する。内容は「コンポーネントは PascalCase で名付ける」。

## 手順（SKILL.md に準拠）

### 1. スキルを読む

`/home/user/trend_diary/.claude/skills/rule-creator/SKILL.md` を読み、手順（意図を捉える → スコープとファイルを決める → ルールを書く → 検証する）に従った。

### 2. 意図を捉える

- **何の規約か**: コンポーネントの命名を PascalCase に統一する
- **なぜ必要か**: JSX では小文字始まりのタグが HTML 要素として解釈されるため、コンポーネントは大文字始まりが必須。React の慣例にも沿う
- **対象範囲**: client の components 配下の `.tsx` に限定（全ファイルではない）
- **既存ルールとの関係**: 命名系のルールは未存在のため新規ファイルが適切

### 3. スコープとファイルを決める

参照した実リポジトリのファイル:

- 既存ルール一覧: `/home/user/trend_diary/.claude/rules/`
  - `test.md`（`paths: **/*.test.ts`）
  - `architecture.md`（`paths: **/src/**/*.{ts,tsx}`）
  - `import.md`（`paths: **/src/**/*.{ts,tsx}`）
  - `logging.md`（`paths: **/packages/web/src/server/**/*.ts`, `**/packages/cron/src/**/*.ts`）
  - `api-validation.md`（`paths: **/web/src/server/**/*.ts`）
- 命名規約の重複が無いことを `Grep`（PascalCase|命名|naming|コンポーネント）で確認 → ヒットなし。よって新規ファイル `naming.md` とした。

既存ルールの作法を踏襲:

- 見出しは `# 〇〇規約`
- 箇条書き＋ why をネストで添える（`architecture.md`・`test.md` が好例）
- 日本語かつ適度な敬語

### glob を components 配下にどう絞ったか（過度に広くしない理由）

採用した `paths`:

```yaml
paths:
  - "**/packages/web/src/client/components/**/*.tsx"
```

絞り込みの根拠:

- **拡張子は `.tsx` のみ**にした。`Glob`（`**/*.tsx` を `.../components` 配下に適用）で対象を確認したところ、コンポーネント本体・stories はすべて `.tsx`。一方、`components/shadcn/hooks/use-mobile.ts` や `components/shadcn/lib/utils.ts` のような `.ts` ファイルも同居しているが、これらはコンポーネントではないため命名規約の対象外。`.ts` を含めると規約の意味（コンポーネントの命名）とズレるため、`.tsx` に限定した。
- **`client/components` 配下に限定**した。`client` 配下には `features` / `routes` / `infrastructure` / `lib` 等もあるが、今回の依頼は「components 配下」に明示限定。`client/**/*.tsx` のように広げると routes や features まで巻き込み、対象外ファイルに不要なコンテキストを載せてしまう。意図どおり components サブツリーだけに閉じた。
- **接頭辞 `**/` を付けた**。既存の `logging.md` / `api-validation.md` が `**/packages/web/...` 形式を採用しているため、リポジトリ内の作法に合わせた。monorepo のどの作業ディレクトリ起点でもマッチさせる狙い。
- `architecture.md` のような `**/src/**/*.{ts,tsx}`（全 src）にはしなかった。全 TS/TSX に効く普遍規約ではなく、client コンポーネントに閉じた指示だからこそ `.claude/rules/` のパススコープを使う意義がある。

### 4. 検証

- フロントマターは正しい YAML（`paths` は配列）。
- glob が実ファイルにマッチすることを確認: `application/packages/web/src/client/components` 配下の `.tsx` は 41 件あり、すべて対象に入る。`.ts`（hooks/use-mobile.ts、lib/utils.ts）は対象外で意図どおり。
- 既存ルール・CLAUDE.md と矛盾なし（命名規約は新規トピック）。

## 最終ファイルの要点

- 出力: `outputs/naming.md`（実リポジトリの `.claude/rules/` には書き込んでいない。本テストの制約に従い workspace 配下のみ）
- スコープ: `**/packages/web/src/client/components/**/*.tsx`
- 規約: コンポーネントは PascalCase で名付ける（理由を why としてネスト記載）
- 実リポジトリのファイルは一切変更せず、git commit / push も実施していない。
