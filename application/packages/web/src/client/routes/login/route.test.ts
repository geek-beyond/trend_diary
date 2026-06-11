import type { LoaderFunctionArgs } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { resolveTurnstileSiteKey } from '@/client/features/authenticate/turnstile'
import { loader, meta } from './route'

vi.mock('@/client/features/authenticate/turnstile', () => ({
  resolveTurnstileSiteKey: vi.fn(),
}))

function buildLoaderArgs(): LoaderFunctionArgs {
  const request = new Request('https://trend-diary.example/login')
  return {
    request,
    url: new URL(request.url),
    pattern: '/login',
    params: {},
    context: {},
  }
}

function buildMetaArgs(): Parameters<typeof meta>[0] {
  return {
    data: undefined,
    loaderData: undefined,
    params: {},
    location: { pathname: '/login', search: '', hash: '', state: null, key: 'default' },
    matches: [],
  }
}

describe('login loader', () => {
  beforeEach(() => {
    vi.mocked(resolveTurnstileSiteKey).mockReset()
  })

  it('Turnstileサイトキーが設定されている場合はそれを返す', () => {
    vi.mocked(resolveTurnstileSiteKey).mockReturnValue('site-key')

    expect(loader(buildLoaderArgs())).toEqual({ turnstileSiteKey: 'site-key' })
  })

  it('Turnstileサイトキーが未設定の場合はnullを返しウィジェットを描画させない', () => {
    vi.mocked(resolveTurnstileSiteKey).mockReturnValue(undefined)

    expect(loader(buildLoaderArgs())).toEqual({ turnstileSiteKey: null })
  })
})

describe('login meta', () => {
  it('ログインページのタイトルとdescriptionを返す', () => {
    const tags = meta(buildMetaArgs())

    expect(tags).toContainEqual({ title: 'ログイン | TrendDiary' })
    expect(tags).toContainEqual(expect.objectContaining({ name: 'description' }))
  })
})
