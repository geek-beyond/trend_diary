---
paths:
  - "**/*.test.ts"
---

# テスト規約

- 分岐や関数が増えない範囲で、なるべくテーブル駆動テスト（`it.each` 等）にする
  - 理由: 同種のケースを表形式で一覧でき、ケース追加が容易で網羅性を読み取りやすい
  - 注意: テーブル化のために条件分岐やケースごとのコールバック関数が増えるなら、可読性を優先して個別のテストに分ける

- テストケースは正常系・準正常系・異常系の3つに `describe` でグルーピングする
  - 理由: 観点の抜け漏れを構造から把握でき、ケース追加時に置き場所が一意に定まる
  - 区分の指針:
    - 正常系: 期待通りに成功するケース
    - 準正常系: 入力不備や業務エラーなど、想定済みでハンドリングされる失敗ケース（ユーザーに訂正・案内を返す。サーバがエラーレスポンスを返す場合を含む）
    - 異常系: 例外・通信断など想定外の失敗ケース（応答すら得られない場合）
  - 注意: 観点が1区分しか無いなど、グルーピングがかえって冗長になる場合は無理に分けない

- neverthrow の `Result` を検証するときは、`isOk()` / `isErr()` の入れ子 `if` で型を絞らず、`_unsafeUnwrap()` / `_unsafeUnwrapErr()` で中身を取り出してアサートする
  - 理由: `if (result.isOk()) { expect(result.value)... }` は「if を通らなければ何もアサートされない」ため、Ok/Err が逆転しても素通りしうる。`_unsafeUnwrap()` は Err のとき（`_unsafeUnwrapErr()` は Ok のとき）その場で throw するので、期待と逆の結果はテスト失敗として顕在化する
  - 例: 値の検証は `expect(result._unsafeUnwrap()).toEqual(expected)`、エラー種別は `expect(result._unsafeUnwrapErr()).toBeInstanceOf(ClientError)`
  - エラーの付随プロパティ（`statusCode` 等）は `instanceof` で絞ってから読むのではなく `toMatchObject` で照合する。例: `const error = result._unsafeUnwrapErr(); expect(error).toBeInstanceOf(ClientError); expect(error).toMatchObject({ statusCode: 400 })`
    - 理由: `as` での絞り込み（`typescript/consistent-type-assertions` で禁止）も、内側の `if (error instanceof ClientError)` も要らず、1〜2行でプロパティまで検証できる
