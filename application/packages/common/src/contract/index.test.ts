import { AssertionError } from 'node:assert'
import { describe, expect, it } from 'vitest'
import { assert, assertNonNull } from './index'

// assert 後の narrowing を型レベルで検証するため、引数の型を絞る前の union に保つヘルパー
const lengthOf = (value: string | undefined): number => {
  assert(value !== undefined, 'value must be defined')
  // narrowing が効かなければ string | undefined のままで型エラーになる
  return value.length
}

const idOf = (value: { id: number } | null): number => {
  assertNonNull(value, 'entity')
  // narrowing が効かなければ null 可能性が残り型エラーになる
  return value.id
}

describe('assert', () => {
  it('条件が真なら何も送出しない', () => {
    expect(() => assert(1 === 1, 'should not throw')).not.toThrow()
  })

  it('契約違反（条件が偽）なら AssertionError を送出し、メッセージを保持する', () => {
    expect(() => assert(false, 'invariant broken')).toThrow(AssertionError)
    expect(() => assert(false, 'invariant broken')).toThrow('invariant broken')
  })

  it('表明後は条件が narrowing され、値を非 null として扱える', () => {
    expect(lengthOf('x')).toBe(1)
  })
})

describe('assertNonNull', () => {
  it('値が null なら AssertionError を送出し、name をメッセージに含める', () => {
    expect(() => assertNonNull(null, 'sessionUser')).toThrow(AssertionError)
    expect(() => assertNonNull(null, 'sessionUser')).toThrow(
      'sessionUser is required but was not set',
    )
  })

  it('値が undefined でも送出する', () => {
    expect(() => assertNonNull(undefined, 'appLog')).toThrow('appLog is required but was not set')
  })

  it('0・空文字・false など falsy でも non-null なら送出しない', () => {
    expect(() => assertNonNull(0, 'count')).not.toThrow()
    expect(() => assertNonNull('', 'title')).not.toThrow()
    expect(() => assertNonNull(false, 'flag')).not.toThrow()
  })

  it('表明後は NonNullable へ narrowing される', () => {
    expect(idOf({ id: 1 })).toBe(1)
  })
})
