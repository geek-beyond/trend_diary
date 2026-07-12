import { describe, expect, it } from 'vitest'
import { themeSchema, themeUpdateSchema } from './theme-schema'

describe('themeSchema', () => {
  describe('正常系', () => {
    it.each(['system', 'light', 'dark'])('許可値 %s を検証できる', (value) => {
      const result = themeSchema.safeParse(value)
      expect(result.success).toBe(true)
    })
  })

  describe('異常系', () => {
    it.each(['blue', '', 'SYSTEM', 'auto'])('許可値以外 %s は検証に失敗する', (value) => {
      const result = themeSchema.safeParse(value)
      expect(result.success).toBe(false)
    })
  })
})

describe('themeUpdateSchema', () => {
  describe('正常系', () => {
    it('themeを持つオブジェクトを検証できる', () => {
      const result = themeUpdateSchema.safeParse({ theme: 'dark' })
      expect(result.success).toBe(true)
    })
  })

  describe('異常系', () => {
    it('themeが欠けている場合は検証に失敗する', () => {
      const result = themeUpdateSchema.safeParse({})
      expect(result.success).toBe(false)
    })

    it('themeが許可値以外の場合は検証に失敗する', () => {
      const result = themeUpdateSchema.safeParse({ theme: 'blue' })
      expect(result.success).toBe(false)
    })
  })
})
