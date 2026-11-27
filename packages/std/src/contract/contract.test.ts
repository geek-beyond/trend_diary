import { describe, expect, it } from 'vitest'
import { assert, AssertionError, assertNonNull } from './index'

describe('契約違反', () => {
  it('失敗は原因を識別できるAssertionErrorとして送出する', () => {
    expect(() => assert(false, 'broken')).toThrowError(
      expect.objectContaining({ name: 'AssertionError', message: 'broken' }),
    )
    expect(() => assert(false, 'broken')).toThrow(AssertionError)
  })

  it.each([null, undefined])('必須値が%jなら名前を含む契約違反を送出する', (value) => {
    expect(() => assertNonNull(value, 'binding')).toThrow('binding is required but was not set')
  })

  it('null以外のfalsyな値は設定済みとして扱う', () => {
    expect(() => assertNonNull(0, 'number')).not.toThrow()
    expect(() => assertNonNull('', 'text')).not.toThrow()
    expect(() => assertNonNull(false, 'flag')).not.toThrow()
  })
})
