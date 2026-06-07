import { describe, expect, it, vi } from 'vitest'
import { isDevelopmentNodeEnv } from './node-env'

describe('isDevelopmentNodeEnv', () => {
  it('NODE_ENVがdevelopmentのときtrue', () => {
    vi.stubEnv('NODE_ENV', 'development')
    try {
      expect(isDevelopmentNodeEnv()).toBe(true)
    } finally {
      vi.unstubAllEnvs()
    }
  })

  it('NODE_ENVがdevelopment以外のときfalse', () => {
    vi.stubEnv('NODE_ENV', 'test')
    try {
      expect(isDevelopmentNodeEnv()).toBe(false)
    } finally {
      vi.unstubAllEnvs()
    }
  })
})
