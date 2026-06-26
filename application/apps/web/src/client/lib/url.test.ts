import { describe, expect, it } from 'vitest'
import { toSafeExternalPath } from './url'

describe('toSafeExternalPath', () => {
  it('http/https URLはExternalPathとして返す', () => {
    expect(toSafeExternalPath('https://example.com/path')).toBe('https://example.com/path')
    expect(toSafeExternalPath('http://example.com/path')).toBe('http://example.com/path')
  })

  it('http/https以外のスキームはnullを返す', () => {
    expect(toSafeExternalPath('javascript:alert(1)')).toBeNull()
    expect(toSafeExternalPath('ftp://example.com/path')).toBeNull()
  })

  it('URLとして不正な文字列はnullを返す', () => {
    expect(toSafeExternalPath('not-a-url')).toBeNull()
  })
})
