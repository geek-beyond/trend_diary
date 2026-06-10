# transcript — rule-creator スキル実行テスト (iteration-2 / eval-0 / with_skill / run-1)

## タスク

「リリースのたびに、CHANGELOG を更新して、バージョンタグを打って、wrangler deploy して、最後に Discord に完了通知を送る——この一連の手順をプロジェクトのルールに追加しておいてほしい」

## 実施手順

1. 指定スキル `/home/user/trend_diary/.claude/skills/rule-creator/SKILL.md` を最初に読み、手順と判断基準を確認した。
2. 既存ルール群を確認した:
   - `/home/user/trend_diary/.claude/rules/architecture.md`
   - `/home/user/trend_diary/.claude/rules/api-validation.md`
   - `/home/user/trend_diary/.claude/rules/import.md`
   - `/home/user/trend_diary/.claude/rules/logging.md`
   - `/home/user/trend_diary/.claude/rules/test.md`
   いずれも `paths:` でファイル種別／ディレクトリにスコープした「コーディング規約・命名・テスト方針」であり、コードを書くときに守る約束事だった。
3. リポジトリ実体を確認した:
   - `wrangler.toml` は `application/packages/web` と `application/packages/cron` に実在（`wrangler deploy` 対象が 2 つある）。
   - `CHANGELOG` は現状存在しない。
   - 既存スキルに `commit`・`tdd` など「呼び出したときだけ動く逐次ワークフロー」型が既にある。

## 参照ファイル

- スキル: `/home/user/trend_diary/.claude/skills/rule-creator/SKILL.md`
- 既存ルール: `/home/user/trend_diary/.claude/rules/*.md`（上記5件）
- 実体確認: `application/packages/web/wrangler.toml`, `application/packages/cron/wrangler.toml`
- CLAUDE.md（プロジェクト指示）

## 判断: 「ルール」ではなく「スキル」が適切

rule-creator スキル自身が明示している判断基準に照らすと、本タスクはルールにすべきではない。

スキルの決定表（SKILL.md より）:

| 永続化したいもの | 置き場所 |
|---|---|
| 全セッションで常に効く普遍ルール | `CLAUDE.md` |
| トピック別・パス別の規約 | `.claude/rules/*.md` |
| 呼び出し時だけ実行する手順 | スキル（`.claude/skills/`） |
| 機械的に強制したい禁止事項 | PreToolUse フック |

また「やってはいけないこと」に **「逐次手順や『実行する作業』をルールに書く（それはスキルの領分）」** と明記されている。

本タスクは「CHANGELOG 更新 → タグ → wrangler deploy → Discord 通知」という**順序のある一連の作業手順**であり、リリース時に**呼び出したときだけ実行する**もの。特定ファイル種別・ディレクトリに効く「書き方の約束事（規約）」ではない。`.claude/rules/` の既存ファイルがすべて `paths:` 付きのコーディング規約である作法とも整合しない。

したがって正しい置き場所は `.claude/skills/`（スキル）であり、ルール化は不適切と判断した。

### 代替案（採用した成果物）

`release` という名前のスキル雛形を作成した。リリース手順をステップ1〜4として逐次実行する構成にし、`commit` / `tdd` など既存スキルの作法（フロントマターの name / description / argument-hint / allowed-tools、手順の見出し、やってはいけないこと節）に合わせた。

- 文体は日本語かつ適度な敬語（CLAUDE.md の開発ルール準拠）。
- wrangler 対象が web / cron の2つある点を手順に反映。
- Discord Webhook 等のシークレットをハードコードしない注意を明記。
- CHANGELOG が未作成である点を踏まえ、無ければ作成方針を確認するステップにした。

なお、もしユーザーが「ルールとして」何かを残したい場合の最小の代替としては、`.claude/rules/release.md` にリリース時の**約束事（規約）のみ**（例: 「リリースは必ずこの順序で行う」「Discord 通知のシークレットはコードに残さない」といった守るべき方針）を置き、具体的な逐次実行はスキルに委ねる、という分離も可能。ただし手順本体はスキルが本筋。

## 制約遵守

- 実リポジトリの `.claude/rules/`・`CLAUDE.md` 等は一切変更していない（読み取りのみ）。
- git commit / push はしていない。
- 成果物は指定の outputs ディレクトリ配下にのみ作成した。

## 最終成果物の要点

- `outputs/release/SKILL.md` — リリース手順スキルの雛形。ルールではなくスキルとして実装した代替案。
- 本タスクは rule-creator の対象外（ルール化は不適切）と結論。
