import { err, ok } from 'neverthrow'
import type { LoaderFunctionArgs } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createAuthActionUseCase } from '@/client/features/authenticate/auth-action-use-case'
import { loader } from './app-layout'

const { getCurrentActiveUser, headers } = vi.hoisted(() => {
  const headers = new Headers()
  // Supabaseのセッション更新で付与される Set-Cookie を模す
  headers.append('Set-Cookie', 'sb-access-token=refreshed; Path=/')
  return { getCurrentActiveUser: vi.fn(), headers }
})

vi.mock('@/client/features/authenticate/auth-action-use-case', () => ({
  createAuthActionUseCase: vi.fn(() => ({ useCase: { getCurrentActiveUser }, headers })),
}))

function buildLoaderArgs(): LoaderFunctionArgs {
  const request = new Request('http://localhost/trends')
  return {
    request,
    url: new URL(request.url),
    pattern: '/trends',
    params: {},
    context: {},
  }
}

describe('app-layout loader', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('認証済みユーザーが取得できた場合はisLoggedInがtrueになる', async () => {
    getCurrentActiveUser.mockResolvedValue(ok({ userId: 'user-1', displayName: 'テスト' }))

    const result = await loader(buildLoaderArgs())

    expect(result.data).toEqual({ isLoggedIn: true })
  })

  it('セッション更新で付与されたSet-Cookieヘッダーがレスポンスに転送される', async () => {
    getCurrentActiveUser.mockResolvedValue(ok({ userId: 'user-1', displayName: 'テスト' }))

    const result = await loader(buildLoaderArgs())

    expect(result.init?.headers).toBe(headers)
  })

  it('認証情報の取得に失敗した場合はisLoggedInがfalseになる', async () => {
    getCurrentActiveUser.mockResolvedValue(err(new Error('unauthorized')))

    const result = await loader(buildLoaderArgs())

    expect(result.data).toEqual({ isLoggedIn: false })
  })

  it('UseCase生成時に例外が発生した場合はisLoggedInがfalseにフォールバックする', async () => {
    vi.mocked(createAuthActionUseCase).mockImplementationOnce(() => {
      throw new Error('Supabase auth is not configured.')
    })

    const result = await loader(buildLoaderArgs())

    expect(result.data).toEqual({ isLoggedIn: false })
  })
})
