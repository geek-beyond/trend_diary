---
paths:
  - "**/src/**/*.{ts,tsx}"
---

# 契約プログラミング規約

内部契約（ミドルウェアが必ず設定する値、DB スキーマや SQL 構造が保証する非 NULL、到達不能な分岐などの不変条件）の破れは、フォールバックで握りつぶさず throw で顕在化させる。

## 契約違反はアサートする

- 契約違反をデフォルト値補完（`?? x` / `|| x`）・optional chaining（`?.`）・黙殺スキップ（if で除外・continue）で通さず、`@trend-diary/std/contract` の `assert` / `assertNonNull` で送出する（手書きの `if (...) throw new Error(...)` は使わない）
  - `assert(condition, message)`: 不変条件の表明。`asserts condition` で以降のコードに narrowing が効く
  - `assertNonNull(value, name)`: 非 null 契約の表明。値を `NonNullable` へ絞る。Context 値専用の `mustGet` はこれを土台にした薄いラッパー
  - 契約違反は `assert` が送出する専用の `AssertionError`（`@trend-diary/std/contract`）で識別する。`errorHandler`（`apps/web/src/middleware/error-handler.ts`）が「contract violation」として明示ログ＋5xx 通知する。`std` はクライアントからもインポートされるため `node:assert` に依存せず自前定義する（`invariant` 系は本番でメッセージを潰すため不採用）
  - 理由: 握りつぶすとデータ破損や配線ミスが正常値のふりをして下流へ静かに伝播し、発見が遅れる。即座に落として errorHandler の 5xx 通知で検知する方が安全
  - エラーメッセージは英語で書く（診断出力に表示される開発者向けメッセージのため）
- 契約違反（サーバ側の配線ミス）をクライアントエラー（401 / 404 / 422 等）に偽装しない
  - 理由: 原因がサーバ内部にあるのにクライアント起因に見え、監視からも漏れる
- Hono の Context 値（`APP_LOG` / `SESSION_USER` 等、契約上必ず設定される値）は非 null アサーション（`!`）ではなく `mustGet`（`apps/web/src/middleware/context.ts`）で取得する
- 型アサーション（`as`）で契約違反の可能性を型上消さない。実行時検証（型ガード）＋送出に置き換える（例: `isArticleMedia`）
- 到達不能なはずの分岐は正常値（`ok(0)` 等）で処理せず送出する。型ナローイングのためだけのガードでも、到達時は送出する
- プラットフォーム契約（fetch の `Response.headers` / `text()` 等、標準 API が保証する形状）への過剰防御（`?.` / `typeof` チェック）は書かない
  - 補足: テストモックの不足が理由なら、本体に防御を足すのではなくモック側を実契約の形に合わせて直す
- `Result` の `isErr()` を確認した上で正常値に縮退させる形の握りつぶしもしない。契約違反由来の err（内部生成の入力に対する失敗など）は throw で伝播する
  - 理由: `isErr` 分岐があると一見ハンドリング済みに見えるが、縮退値（UTC の今日・空範囲など）が正常のふりをして下流へ伝播する点はフォールバックと同じ
  - React では throw をルート直下のエラーバウンダリに委ねる（`.claude/rules/react.md` 参照。先例: `daily-summary.ts` の `getTodayJst`）
- 契約違反時に送出する仕様はテストコードに記載する（例: `query-impl.test.ts` の契約違反ケース）

## レイヤー間の契約整合

- ドメインの Zod スキーマは実行時に parse されず型の供給源として働くため、DB 契約（NOT NULL・値の集合）より緩く書かない（例: `media` は `z.enum(ARTICLE_MEDIA)`、`authenticationId` は必須）
  - 理由: スキーマが緩いと下流に optional 分岐や `as` が生え、契約の定義が二重化する
- 実行時の強制は、生データが流入する境界（生 SQL のマッパ等）で型ガード＋送出により行う。同じカラムを扱う複数の読み取り経路で検証の有無を非対称にしない
  - 理由: 非対称だと「片方の経路は送出で顕在化、もう片方は不正値を静かに配信」という二枚舌になり、発見が遅れる
- 逆方向の偽装もしない: 外部入力は内部のアサート（`toDbId` の RangeError 等）へ到達する前にバリデーションで 422 に境界化する（例: `articleIdParamSchema` の safe integer 上限）
  - 理由: クライアント起因の不正値が内部アサートまで届くと 500・障害通知に化け、契約違反の監視のノイズになる

## Result と throw の使い分け

- 想定内の失敗（外部 I/O の失敗・業務エラーなど、呼び出し元がハンドリングすべきもの）は neverthrow の `Result` で返す
- 契約違反（プログラミングエラー・データ破損など、起きた時点でリカバリ不能なもの）は `Result` に乗せず throw する
  - 理由: 契約違反を `err` で返すと呼び出し元に「ハンドリングすべき失敗」と誤認させる。throw なら最上位の errorHandler に直行し、通知まで一直線になる

## 契約違反ではないもの（フォールバック・縮退でよい）

- 外部入力の欠落: HTTP ヘッダ、外部フィードのフィールド、外部 SDK の optional 型（例: Supabase の `user.email`）
- optional 宣言された env / バインディング（例: `LOG_LEVEL?`、`AUTH_RATE_LIMITER?`）の未設定分岐
- 空結果が正当なケース（例: 該当 0 件の集計での `?? 0`）や、クライアントのローディング中デフォルト
- 意図的な縮退設計（例: Discord webhook が空のときの warn＋スキップ、ストレージ無効環境での書き込み失敗の破棄）。ただし縮退である理由を why コメントで残す
  - 補足: 縮退させる失敗は限定する。取得失敗を一律に縮退させず、正当な失敗（例: 401）だけ縮退し、それ以外（5xx 等）は送出する
