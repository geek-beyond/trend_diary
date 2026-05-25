# neverthrowの運用

<!-- Title という文字を消してこの ADR のタイトルを書いてください -->

Status: Deprecated

<!-- プルリクベースで開発するので、プルリクを作る段で Accepted の状態でOK -->
<!-- 別のADRによって置き換えられた場合 Replaced by #{ADR No.} に変更 -->
<!-- 明らかに不要になった場合 Deprecated に変更 -->

Relevant PR:

https://github.com/geek-beyond/trend_diary/pull/154

<!-- reference できるプルリクがあればそのリンクを貼ってください -->

# Context

<!-- アーキテクチャ上の判断をするに至った背景や経緯を書いてください -->

Result型を導入し、Errors as valuesパターンを実現する。
実現する目的は上位レイヤー・モジュールが下位の処理を知らなくて良いようにすることである。
そこで、neverthrowを導入したが、サービス層の処理でResultAsync関連で柔軟性が低くなり
めんどくさくなった。

## References

<!-- 判断に使った資料などがあればここにリンクなどを貼ってください -->
<!-- Context の文中に記載しても問題ないです -->

https://qiita.com/yonaka15/items/754605c82c146d1550a1

https://x.com/ChShersh/status/1859922977208598610

# Decision

<!-- 下した判断を簡潔に書いてください -->

サービス層の返り値には`Promise<Result<T, E>>`、
下位モジュールの非同期処理には`ResultAsync<T, E>`を使用する。

## Reason

- サービス層では従来のTS、JSライクな処理の方が好ましいため
- neverthrowはRustと類似の厳密性であるが、TSではそこまで厳密性を求める思想ではないため

<!-- 下した判断の理由を書いてください -->
<!-- Decision の他に検討した選択肢があれば書いてください -->

# Consequences

- 厳密に管理したい副作用を発生させる下位モジュールのリターンがわかりやすくなった
- サービス以上のレイヤーでは従来のTSに近い記法を維持でき、可読性が向上した
<!-- Decisionを適用した結果、その決定がなされる前と後で何が変わったか（良くなったか/悪くなったか）を書いてください。 -->
