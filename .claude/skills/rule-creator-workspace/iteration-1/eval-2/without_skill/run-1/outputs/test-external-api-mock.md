---
paths:
  - "**/*.test.ts"
---

# テストでの外部API通信禁止規約

- テストでは外部APIへの実通信を禁止し、必ずモックする
  - 理由: 実通信はネットワーク状況や外部サービスの状態に依存して結果が変わり、テストが不安定（flaky）・低速になる。また外部サービスへ意図しない副作用を与えうるため
  - 対象: `fetch` をはじめとする HTTP クライアント、Webhook 送信、Discord / Qiita / Zenn / はてな等の外部フィード取得など、プロセス外への通信全般
- モックには Vitest の機能を使う（本リポジトリでは `msw` / `nock` 等は導入していない）
  - `fetch` はグローバルをスタブする: `const fetchMock = vi.fn()` を `vi.stubGlobal('fetch', fetchMock)` で差し替える
  - レスポンスはケースごとに `mockResolvedValueOnce` / `mockRejectedValueOnce` で明示し、成功・失敗の両系統を検証する
  - 通信を行わないことを期待するケースでは `expect(fetchMock).not.toHaveBeenCalled()` で実通信が発生しないことを確認する
  - `beforeEach` で `vi.resetAllMocks()` 等を呼び、テスト間でモック状態を持ち越さない
- 実装が外部クライアントをDI（依存性注入）で受け取れる場合は、`fetch` の差し替えではなくクライアントのモックを注入してもよい
  - いずれの方法でも、テスト実行中に実ネットワークへ到達しないことを必須とする

参考実装: `application/packages/notification/src/discord.test.ts`、`application/packages/cron/src/fetch-articles.test.ts`
