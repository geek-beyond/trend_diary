import type { LoaderFunctionArgs } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { resolveTurnstileSiteKey } from '@/client/features/authenticate/turnstile'
import { loader, meta } from './route'

vi.mock('@/client/features/authenticate/turnstile', () => ({
  resolveTurnstileSiteKey: vi.fn(),
}))

function buildLoaderArgs(): LoaderFunctionArgs {
  const request = new Request('https://trend-diary.example/signup')
  return {
    request,
    url: new URL(request.url),
    pattern: '/signup',
    params: {},
    context: {},
  }
}

function buildMetaArgs(): Parameters<typeof meta>[0] {
  return {
    data: undefined,
    loaderData: undefined,
    params: {},
    location: { pathname: '/signup', search: '', hash: '', state: null, key: 'default' },
    matches: [],
  }
}

describe('signup loader', () => {
  beforeEach(() => {
    vi.mocked(resolveTurnstileSiteKey).mockReset()
  })

  it.each([
    {
      name: '設定されている場合はそれを返す',
      siteKey: 'site-key',
      expected: { turnstileSiteKey: 'site-key' },
    },
    {
      name: '未設定の場合はnullを返しウィジェットを描画させない',
      siteKey: undefined,
      expected: { turnstileSiteKey: null },
    },
  ])('Turnstileサイトキーが$name', ({ siteKey, expected }) => {
    vi.mocked(resolveTurnstileSiteKey).mockReturnValue(siteKey)

    expect(loader(buildLoaderArgs())).toEqual(expected)
  })
})

describe('signup meta', () => {
  it('アカウント作成ページのタイトルとdescriptionを返す', () => {
    const tags = meta(buildMetaArgs())

    expect(tags).toContainEqual({ title: 'アカウント作成 | TrendDiary' })
    expect(tags).toContainEqual(expect.objectContaining({ name: 'description' }))
  })
})
