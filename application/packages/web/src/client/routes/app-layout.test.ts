import { err, ok } from 'neverthrow'
import type { LoaderFunctionArgs } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createAuthActionUseCase } from '@/client/features/authenticate/auth-action-use-case'
import { loader } from './app-layout'

const { getCurrentActiveUser } = vi.hoisted(() => ({ getCurrentActiveUser: vi.fn() }))

vi.mock('@/client/features/authenticate/auth-action-use-case', () => ({
  createAuthActionUseCase: vi.fn(() => ({ useCase: { getCurrentActiveUser } })),
}))

function buildLoaderArgs(): LoaderFunctionArgs {
  const request = new Request('http://localhost/trends')
  return {
    request,
    context: {} as LoaderFunctionArgs['context'],
    params: {},
    url: new URL(request.url),
    pattern: '/trends',
  } as LoaderFunctionArgs
}

describe('app-layout loader', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('認証済みユーザーが取得できた場合はisLoggedInがtrueになる', async () => {
    getCurrentActiveUser.mockResolvedValue(ok({ userId: 'user-1', displayName: 'テスト' }))

    const result = await loader(buildLoaderArgs())

    expect(result).toEqual({ isLoggedIn: true })
  })

  it('認証情報の取得に失敗した場合はisLoggedInがfalseになる', async () => {
    getCurrentActiveUser.mockResolvedValue(err(new Error('unauthorized')))

    const result = await loader(buildLoaderArgs())

    expect(result).toEqual({ isLoggedIn: false })
  })

  it('UseCase生成時に例外が発生した場合はisLoggedInがfalseにフォールバックする', async () => {
    vi.mocked(createAuthActionUseCase).mockImplementationOnce(() => {
      throw new Error('Supabase auth is not configured.')
    })

    const result = await loader(buildLoaderArgs())

    expect(result).toEqual({ isLoggedIn: false })
  })
})
