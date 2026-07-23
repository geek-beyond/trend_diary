import type { RdbClient } from '@trend-diary/datastore/rdb'
import { describe, expect, it } from 'vitest'
import { mockDeep } from 'vitest-mock-extended'
import { createAccountUseCase } from './factory'
import { AccountUseCase } from './use-case'

describe('createAccountUseCase', () => {
  it('RdbClientから AccountUseCase インスタンスを生成すること', () => {
    const rdbClient = mockDeep<RdbClient>()

    const useCase = createAccountUseCase(rdbClient)

    expect(useCase).toBeInstanceOf(AccountUseCase)
  })
})
