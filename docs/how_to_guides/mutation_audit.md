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

GitHub Actionsの `Mutation audit` は手動実行できます。この調査のスクリプト・設定・ワークフローを変更するPRでも、全10対象を実行します。通常のソース変更で毎回全件調査すると実行時間が増えるため、差分検査は従来のCIを使います。

## 結果の読み方

JSON・HTMLは `mutation-audit/<対象>/` に出力します。CIはログとレポートを対象別artifactとして30日間保存します。baseline失敗やジョブのタイムアウト時にもログを保存しますが、レポートが完成しない場合があります。

`killMatrix` の `duplicates` は同じ変異を検出したテスト群、`subsumed` は検出する変異が別のテストに包含される候補です。削除前に入力・期待値・仕様を確認し、固有の検証は残すテストへ統合します。型や入力種別が異なるバリデーション、abortの発火タイミング、別APIの契約などは、kill setが同じでも個別の仕様を持ちます。

`noKills` は削除してよいテストの一覧ではありません。変異演算子で表現されない不具合を検出する場合があります。また、`mutants.timeout`・`mutants.incomplete` や未実行の変異がある場合、候補は部分的な結果です。全件を指定したことと、全変異の比較が完了したことを区別してください。

この調査ではスコアの閾値を設けません。既存の生存変異を可視化して整理に使うためです。通常CIの差分に対するcritical判定とstdの閾値は引き続き適用します。

## 対象外

Storybookのブラウザ実行とE2Eは、このVitest adapterによる調査には含めていません。通常のcomponentテストとE2Eで検証します。TypeScript 7との互換性により、変異ごとの型チェックは無効です。
