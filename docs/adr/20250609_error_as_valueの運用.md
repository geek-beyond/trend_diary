# error_as_valueの運用

Status: Accepted

<!-- プルリクベースで開発するので、プルリクを作る段で Accepted の状態でOK -->
<!-- 別のADRによって置き換えられた場合 Replaced by #{ADR No.} に変更 -->
<!-- 明らかに不要になった場合 Deprecated に変更 -->

Relevant PR:

<!-- reference できるプルリクがあればそのリンクを貼ってください -->

# Context

neverthrowを導入して使ってみたが、TypeScriptの使用感とあまりにも合わないため
無くしたい。書き心地が異常なまでに辛い。

## References

- [20250525_neverthrowの運用.md](docs/adr/20250525_neverthrowの運用.md)
- [独自Result　導入例](apps/web/src/middleware/authenticator/authenticator.ts)
  <!-- 判断に使った資料などがあればここにリンクなどを貼ってください -->
  <!-- Context の文中に記載しても問題ないです -->

# Decision

<!-- 下した判断を簡潔に書いてください -->

neverthrowをやめて、独自の簡単なResult型での運用とする。

## Reason

- パラダイムがあまりにも異なるRust Likeな記法とTSで相性が悪い
- neverthrow独自の使い方が多すぎてどうでも良いことを覚える必要がある
- neverthrowのアダプター的コードを書きたくない
  <!-- 下した判断の理由を書いてください -->
  <!-- Decision の他に検討した選択肢があれば書いてください -->

# Consequences

- 導入例を見るとわかるが、Golangでのシンプルなエラーパターンになった
- 書いてて気持ち悪くなくなった
<!-- Decisionを適用した結果、その決定がなされる前と後で何が変わったか（良くなったか/悪くなったか）を書いてください。 -->
