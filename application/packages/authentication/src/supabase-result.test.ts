import { ClientError, ServerError } from '@trend-diary/common/errors'
import { describe, expect, it } from 'vitest'
import { callSupabase } from './supabase-result'

describe('callSupabase', () => {
  describe('正常系', () => {
    it('error が null のとき data を ok として返すこと', async () => {
      const result = await callSupabase(async () => ({
        data: { id: 'passkey-1' },
        error: null,
      }))

      expect(result.isOk()).toBe(true)
      if (result.isOk()) {
        expect(result.value).toEqual({ id: 'passkey-1' })
      }
    })
  })

  describe('準正常系', () => {
    it('業務エラー({ error })を既定で ServerError に写して err を返すこと', async () => {
      const result = await callSupabase(async () => ({
        data: null,
        error: new Error('service down'),
      }))

      expect(result.isErr()).toBe(true)
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ServerError)
        expect(result.error.message).toBe('service down')
      }
    })

    it('業務エラーは mapError で任意のドメインエラーへ写せること', async () => {
      const result = await callSupabase(
        async () => ({ data: null, error: new Error('invalid credentials') }),
        () => new ClientError('Invalid', 401),
      )

      expect(result.isErr()).toBe(true)
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ClientError)
      }
    })
  })

  describe('異常系', () => {
    it('例外は mapError を経由せず常に ServerError として err を返すこと', async () => {
      const result = await callSupabase(
        async () => {
          throw new Error('network down')
        },
        // 例外はここを通らないことを、ClientError にならないことで確認する
        () => new ClientError('should not be used', 401),
      )

      expect(result.isErr()).toBe(true)
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ServerError)
        expect(result.error.message).toBe('network down')
      }
    })
  })
})
