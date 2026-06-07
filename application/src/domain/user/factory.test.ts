import type { SupabaseClient } from '@supabase/supabase-js'
import type { RdbClient } from '@trend-diary/datastore/rdb'
import { describe, expect, it } from 'vitest'
import { mockDeep } from 'vitest-mock-extended'
import { createAuthUseCase } from './factory'
import { AuthUseCase } from './use-case'

describe('createAuthUseCase', () => {
  it('SupabaseClientとRdbClientから AuthUseCase インスタンスを生成すること', () => {
    const supabaseClient = mockDeep<SupabaseClient>()
    const rdbClient = mockDeep<RdbClient>()

    const useCase = createAuthUseCase(supabaseClient, rdbClient)

    expect(useCase).toBeInstanceOf(AuthUseCase)
  })
})
