import { afterEach, beforeEach } from 'vitest'
import { AuthAdminClient } from './client'

const CONFIG = { url: 'http://127.0.0.1:54321', serviceRoleKey: 'dummy-service-role-key' }

describe('AuthAdminClient', () => {
  const originalNodeEnv = process.env.NODE_ENV

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv
  })

  describe('正常系', () => {
    it('テスト環境では生成できること', () => {
      process.env.NODE_ENV = 'test'
      expect(() => new AuthAdminClient(CONFIG)).not.toThrow()
    })
  })

  describe('異常系', () => {
    // service_role 権限の誤用を防ぐため、テスト環境以外での生成は契約違反として弾く
    beforeEach(() => {
      process.env.NODE_ENV = 'production'
    })

    it('テスト環境以外では生成を拒否すること', () => {
      expect(() => new AuthAdminClient(CONFIG)).toThrow()
    })
  })
})
