import type { RdbClient } from '@trend-diary/datastore/rdb'
import { describe, expect, it } from 'vitest'
import { mockDeep } from 'vitest-mock-extended'
import { createAccountUseCase } from './factory'
import type { Notifier } from './repository'
import { AccountUseCase } from './use-case'

describe('createAccountUseCase', () => {
  it('RdbClientとNotifierから AccountUseCase インスタンスを生成すること', () => {
    const rdbClient = mockDeep<RdbClient>()
    const notifier = mockDeep<Notifier>()

    const useCase = createAccountUseCase(rdbClient, notifier)

    expect(useCase).toBeInstanceOf(AccountUseCase)
  })
})
