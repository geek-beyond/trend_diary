---
paths:
  - "**/*.{ts,tsx}"
---

# 命名規則

機械的な lint での強制は行わないため、以下の規則はレビューで担保する。

- 理由: 旧フォーマッタ（Biome）の `useNamingConvention` が担っていたが、oxfmt 移行に伴い撤去した。oxlint が `naming-convention` を未サポートで代替できないため、規約として明文化して人手で守る

## 種別ごとの形式

| 対象 | 許容する形式 |
|---|---|
| 関数（function） | `camelCase` / `PascalCase` |
| 変数（variable） | `camelCase` / `PascalCase` / `CONSTANT_CASE` |
| 型・インターフェース・クラス・enum・型エイリアス（type-like） | `PascalCase` |
| オブジェクトリテラルのプロパティ | `CONSTANT_CASE` / `camelCase` / `snake_case` / `PascalCase` |
| 型のプロパティ（type property） | `PascalCase` / `camelCase` / `CONSTANT_CASE` |

- 連続した大文字は許容する（例: `parseHTML`、`userID`）
- 非 ASCII（日本語等）の識別子も禁止しない

## 例外（上記に従わなくてよいもの）

- 分割代入で外部の名前をそのまま束縛する変数は、その名前のままでよい（例: `const { article_id } = ...`）
  - 理由: 束縛名は参照元の API・スキーマの名前に従うべきで、こちらの都合で改名すると対応が読み取りにくくなる
- 未使用であることを示す先頭アンダースコアの変数（例: `const { isRead: _isRead, ...rest } = ...`）
- 外部ライブラリが定める固定の名前
  - Hono クライアントのメソッド（`$get` / `$post` / `$delete` など `$` 始まり）
  - React Router の future フラグ（`v8_splitRouteModules` など）
- 引用符が必要なプロパティ名（例: `'unread-digestion'`）
