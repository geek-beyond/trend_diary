# メモ化をReact Compilerに委ねる

Status: Accepted

Relevant PR:

https://github.com/geek-beyond/trend_diary/pull/788

# Context

web パッケージでは React Compiler（`babel-plugin-react-compiler`）を有効化しており、コンポーネント・フックのメモ化はビルド時に自動適用される。

一方でコードベースには習慣的に書かれた手書きの `useMemo` / `useCallback` が混在しており、新規コードでも書くべきかどうかの判断が実装者ごとにぶれていた。

## References

- https://react.dev/learn/react-compiler

# Decision

新規コードでは `useMemo` / `useCallback` / `React.memo` を手書きせず、メモ化は React Compiler に委ねる。

- 依存配列の管理が不要になり、フックは通常の関数として記述する
- 既存コードの一括置換は行わず、該当箇所を変更するタイミングで削除する
- React Compiler が最適化できない参照同一性の要件（外部ライブラリが依存の同一性比較を要求する等）が実際に発生した場合のみ、理由をコメントで明示した上で手書きメモ化を許可する

## Reason

- React Compiler 有効下では手書きメモ化は冗長であり、依存配列の指定漏れ・過剰指定という人為ミスの温床だけが残るため
- 依存配列が消えることでフックの本体ロジックが読みやすくなるため

# Consequences

- フックから `useCallback` のラップと依存配列が消え、通常の関数定義として読めるようになった
- メモ化の正しさはコンパイラが保証するため、レビューで依存配列を検査する必要がなくなった
