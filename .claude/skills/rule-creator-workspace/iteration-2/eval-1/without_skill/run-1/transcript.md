# transcript

## タスク

glob パターンで `src` 配下の `.tsx` ファイルだけに効くルールを追加する。
内容は「React コンポーネントには必ず displayName を設定する」。

## 手順

1. 既存ルールの格納場所 `/home/user/trend_diary/.claude/rules/` を確認し、フロントマター形式を把握した。
2. 既存ルールファイル5件を読み、フロントマターの書式と glob パターンの慣習を確認した。
3. 把握した形式に合わせて、出力先ディレクトリに新規ルールファイルを作成した。
4. 制約に従い、実リポジトリのファイル（`.claude/rules/` や `CLAUDE.md`）は一切変更していない。出力は workspace の指定ディレクトリにのみ書き込んだ。

## 参照ファイル

- `/home/user/trend_diary/.claude/rules/api-validation.md`
- `/home/user/trend_diary/.claude/rules/architecture.md`
- `/home/user/trend_diary/.claude/rules/import.md`
- `/home/user/trend_diary/.claude/rules/logging.md`
- `/home/user/trend_diary/.claude/rules/test.md`

## フロントマター形式と glob の判断理由

### フロントマター形式

既存ルールはすべて以下の形式で統一されている。

```
---
paths:
  - "<glob パターン>"
---
```

- `paths` は YAML の配列（リスト）で、複数の glob を列挙できる。
- 各パターンはダブルクオートで囲む。
- フロントマターの後に Markdown 本文（`#` 見出し + 箇条書き）を書く。
- 本文は「why（理由）」を添える方針（CLAUDE.md のコメント規約に整合）。

### glob の判断理由

- 要件は「src 配下の .tsx ファイルだけ」。
- 既存の `architecture.md` / `import.md` は `**/src/**/*.{ts,tsx}` を使っており、本プロジェクトが pnpm monorepo（`application/packages/*/src/...`）であるため、パッケージ階層を跨ぐ先頭ワイルドカード `**/` を付けるのが慣習。
- 今回は `.tsx` のみが対象なので拡張子ブレース展開は使わず `*.tsx` とし、`**/src/**/*.tsx` を採用した。
  - `**/src/` で各パッケージの `src` ディレクトリにマッチ。
  - `/**/*.tsx` で `src` 直下および任意の深さの `.tsx` にマッチ。
  - `.ts` には効かないため「.tsx だけ」という要件を満たす。

## 最終ファイルの要点

- ファイル名: `react-display-name.md`
- `paths`: `**/src/**/*.tsx`（src 配下の .tsx のみ）
- 本文: React コンポーネントには必ず `displayName` を設定する。理由として DevTools / スタックトレースでの可読性、`forwardRef` / `memo` ラップ時の表示名欠落防止を明記。
