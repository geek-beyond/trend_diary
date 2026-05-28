---
name: simplify
description: code-review を実行し、その指摘をもとにコードを simplify（過剰設計や YAGNI 違反を最小コード変更で解消）するワークフロー。
disable-model-invocation: true
argument-hint: "[追加指示 (任意)]"
---

# simplify

`/code-review` を実行して指摘を取得し、その中から **simplify すべきもの** を選び抜いて最小コード変更で対処する。CLAUDE.md の方針（「Don't add features / Don't design for hypothetical future requirements / Three similar lines is better than a premature abstraction」）に沿って、指摘を盲目的に全部修正せず取捨選択する。

## 手順

### 1. レビュー実行

`/code-review` を実行する。出力は JSON 配列形式で、各 finding に `file / line / summary / failure_scenario` がある。

### 2. 指摘を 3 つに分類

各 finding を以下のいずれかに振り分ける（CLAUDE.md の prefix を流用）:

- `[must]` 実バグ / 互換性破壊 / panic / data race / security
  - → 修正必須。リグレッションテスト追加
- `[imo]` 過剰防衛 / 将来罠 / API 設計上の懸念 / latent gotcha
  - → **simplify 対象**。実装で対処せず、コメントで意図を明示 or そもそも削除する選択を検討
- `[nits]` doc 誤り / 命名 / dead parameter / テスト 1 件追加レベル
  - → 1〜数行の最小変更で済むなら直す。コミットメッセージで一括処理

### 3. simplify の判断基準

`[imo]` 指摘を以下の問いで判定する:

1. **「いまの呼び出し側で発火するか？」**
   - No → 削除候補。将来の人を信頼する。コメントすら書かない
   - Yes → `[must]` に格上げ
2. **「型 / 関数シグネチャで強制した方が筋がよいか？」**
   - Yes かつ変更が小さい → やる
   - Yes だが API 大改造になる → やらない。コメントで「将来やるかも」だけ残す（あるいは何も残さない）
3. **「防御コードを追加すべきか？」**
   - 防御が無くて困るのは「将来こうリファクタしたら」のケースだけ → やらない
   - 防御が無いと現在の挙動でデータ破壊 → やる

### 4. 削除すら選択肢に入れる

simplify には「足す」だけでなく「引く」も含まれる:

- 直前のコミットで追加した recover / guard / catch-all / wrapper が、レビューで『過剰』と指摘されたら削除する
- テストが多すぎて実装より長い場合は重複ケースを統合
- ヘルパや wrapper を 1 箇所しか使っていないなら inline 化

### 5. 実行

選び取った修正だけ適用 → ビルド・テスト → コミット。コミットメッセージは:

```
refactor: code-review 指摘のうち simplify 対象 N 件を反映

- xxx は YAGNI として削除
- yyy は doc コメントだけで対処（実装変更なし）
- zzz は型シグネチャで強制（dead param 削除）
```

## 出力の Discipline

- 指摘ごとに **採用 / 不採用 / 部分採用** をユーザーに見える形で報告
- 不採用の理由は「現状の呼び出し側で発火しない」「YAGNI」など 1 行で明示
- 採用したものはコミットに含める前に diff を要約

## 反 patterns

このスキルは以下を **やらない**:

- レビューで挙がった指摘を全部修正する（CLAUDE.md の「Don't design for hypothetical future requirements」違反）
- 将来の罠を防ぐためだけのコメント／TODO を埋め込む
- recover middleware / write-once guard / catch-all 404 のような防御層を、現行コードで発火しないのに足す
- テストを「将来のため」に網羅的に追加する

足すのではなく **引く** を優先する。
