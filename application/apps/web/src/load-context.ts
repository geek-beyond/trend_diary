import type { Context } from 'hono'
import { createContext } from 'react-router'
import type { Env } from './env'

export interface AppLoadContext {
  cloudflare: { env: Env['Bindings'] }
  // secureHeaders が生成する CSP nonce。<Scripts> 等のインラインscript許可に使う
  nonce?: string
}

// v8 では loader/action/middleware の context が RouterContextProvider になり、
// plain object を渡せない。値の受け渡しは createContext のトークン経由で行う。
export const appLoadContext = createContext<AppLoadContext>()

/**
 * secureHeaders が生成した nonce と Cloudflare バインディングを、SSR ハンドラ呼び出し時に
 * RouterContextProvider へ set するための値を Hono の Context から組み立てる。
 */
export function buildLoadContext(c: Context<Env>): AppLoadContext {
  return {
    cloudflare: { env: c.env },
    nonce: c.get('secureHeadersNonce'),
  }
}
