import type { Context } from 'hono'
import type { Env } from '@/env'
import CONTEXT_KEY, { mustGet } from './context'

// oxlint-disable-next-line typescript/no-restricted-types -- Hono の変数ストアへ任意値を投入するテスト用の入力のため
function buildContext(entries: Record<string, unknown>): Context<Env> {
  // oxlint-disable-next-line typescript/no-restricted-types -- Hono の変数ストアを模す、任意値を保持する Map のため
  const store = new Map<string, unknown>(Object.entries(entries))
  // oxlint-disable-next-line typescript/consistent-type-assertions -- テストに必要な最小限の Context を組み立てるため
  return {
    get: (key: string) => store.get(key),
    // oxlint-disable-next-line typescript/no-restricted-types -- 最小限のモックを Hono の複雑な Context 型へ橋渡しする境界キャストのため
  } as unknown as Context<Env>
}

describe('mustGet', () => {
  describe('正常系', () => {
    it('指定キーの値が設定されていればその値を返すこと', () => {
      const sessionUser = { activeUserId: 1n, email: 'user@example.com' }
      const c = buildContext({ [CONTEXT_KEY.SESSION_USER]: sessionUser })

      expect(mustGet(c, CONTEXT_KEY.SESSION_USER)).toBe(sessionUser)
    })
  })

  describe('異常系', () => {
    // 契約上必ず存在するはずの値が未設定なら握りつぶさず送出することを担保する
    it.each([
      ['未設定（undefined）', {}],
      ['null', { [CONTEXT_KEY.SESSION_USER]: null }],
    ])('%s の場合はどのキーか分かるエラーを送出すること', (_label, entries) => {
      const c = buildContext(entries)

      expect(() => mustGet(c, CONTEXT_KEY.SESSION_USER)).toThrow(CONTEXT_KEY.SESSION_USER)
    })
  })
})
