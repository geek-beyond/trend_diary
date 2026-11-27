# ミューテーションテストで重複候補を調べる

通常CIは変更差分の変異を検査します。既存テスト全体の整理には、差分指定を外した `Mutation audit` を使います。

## 対象と実行方法

共有7パッケージ（std、authentication、datastore、domain、logger、notification、runtime）、web client、web server、cronの10対象を個別に実行します。テスト用ヘルパーとStorybookのstoriesは変異対象から除きます。

```sh
pnpm mutate:audit domain
pnpm mutate:audit web-client
pnpm mutate:audit web-server
```

対象を省略すると利用可能な名前を表示して終了します。web serverには通常のserverテストと同じ認証エミュレータが必要です。CIはsupa-emuを起動します。ローカルでは127.0.0.1:54321で起動してから実行してください。

GitHub Actionsの `Mutation audit` は手動実行できます。この調査のスクリプト・設定・ワークフローを変更するPRの作成時にも、全10対象を実行します。実行中の調査を修正pushで中断しないよう、PR更新時は自動で再実行しません。修正後の再調査は手動実行してください。通常のソース変更で毎回全件調査すると実行時間が増えるため、差分検査は従来のCIを使います。

## ローカルで調査してからCIで再確認する

まずローカルで対象を実行し、`node scripts/mutation/summarize.mjs mutation-audit` で全10対象を集約します。未実行の対象は欠落として表示されます。CIは同じコマンドを実行し、最後のsummaryジョブで全artifactを集約します。通常CIは差分の回帰検出、全件調査は既存の実装・テストの整理に使います。

## 結果の読み方

JSON・HTMLは `mutation-audit/<対象>/` に出力します。CIはログとレポートを対象別artifactとして30日間保存します。baseline失敗やジョブのタイムアウト時にもログを保存しますが、レポートが完成しない場合があります。

summaryジョブのJob Summaryは対象別・分類別の件数と全検出項目を表示します。全件の構造化データは `mutation-audit-summary` artifactの `summary.json`、完全な表示は `summary.md` から取得できます。詳細がJob Summaryのサイズ制限を超える場合は、対象・分類ごとの全検出IDを表示します。ID一覧も制限を超える場合はその旨と取得先を表示し、全件のartifactは省略しません。

分類はsurvived・noCoverage・duplicates・subsumed・noKills・timeout・incompleteです。レポート欠落や形式不正は「—」、有効な結果で検出がない場合は0件と表示します。`partial`は未完了・旧コミットの結果を含み、`complete`でも検出項目の判断が完了した意味ではありません。moduleロード失敗やテスト単位の比較ができなかった変異もincompleteに含めます。

survived・noCoverage・timeoutは変異数、duplicatesはテスト群数、subsumed・noKillsはテスト数です。incompleteは未比較変異や実行警告の件数であり、すべてが変異数とは限りません。

各項目は安定したID、変異位置、元の式と置換後の式、関係するテストIDを持ちます。duplicates・subsumedには同じkill setを構成する変異のIDと内容も含めます。`docs/mutation/review.json` の `decisions` にIDをキーとして `action`（maintain / fix / defer）、`reason`、`references`、集約から得た `evidenceHash` を記録します。結果が変わった項目は未判断に戻ります。`defer`は未対応理由を記録した状態であり、修正済みではありません。

同じ根拠は `groups` にまとめ、`decisions` では `group` と項目ごとの `evidenceHash` を指定できます。グループの定義だけで未列挙の項目を判断済みにはしません。`reviewComplete` は全対象の有効な実行記録と、全項目の根拠付き判断が揃ったことを表します。計測の `complete` とは別の値であり、timeout・incompleteの理由を判断しても未実施の比較が完了したことにはなりません。

`killMatrix` の `duplicates` は同じ変異を検出したテスト群、`subsumed` は検出する変異が別のテストに包含される候補です。削除前に入力・期待値・仕様を確認し、固有の検証は残すテストへ統合します。型や入力種別が異なるバリデーション、abortの発火タイミング、別APIの契約などは、kill setが同じでも個別の仕様を持ちます。

`noKills` は削除してよいテストの一覧ではありません。変異演算子で表現されない不具合を検出する場合があります。また、`mutants.timeout`・`mutants.incomplete` や未実行の変異がある場合、候補は部分的な結果です。全件を指定したことと、全変異の比較が完了したことを区別してください。

この調査ではスコアの閾値を設けません。既存の生存変異を可視化して整理に使うためです。通常CIの差分に対するcritical判定とstdの閾値は引き続き適用します。

## 計測環境が結果に影響する場合

変換キャッシュが残るとcoverageが欠落し、前回のmoduleエラーが後続の判定へ混ざる場合があります。また、テスト本体の時間だけを予算にすると、D1などの初期化時間で正常な変異もtimeoutになります。このリポジトリのVitest adapterのパッチはこれらを分離し、回帰テストで確認しています。異常な件数やtimeoutが出た場合は限定実行と比較し、すぐにテスト削除や追加の根拠にしないでください。

調査中に実装・テストを編集すると、実行前後の結果が混在します。修正をまとめてから対象を再実行してください。テストの途中失敗後に未消費のmock応答や外部フィクスチャが残る場合も、比較結果が混ざるため後始末を確認してください。

## 対象外

Storybookのブラウザ実行とE2Eは、このVitest adapterによる調査には含めていません。通常のcomponentテストとE2Eで検証します。TypeScript 7との互換性により、変異ごとの型チェックは無効です。

調査・修正には [.claude/skills/mutation-test-review/SKILL.md](../../.claude/skills/mutation-test-review/SKILL.md) を使います。
