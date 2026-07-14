import type { Context } from 'hono'
import type { AppLoadContext } from 'react-router'

// hono-react-router-adapter が getLoadContext に渡す引数の形。型が非公開のため必要分だけ定義する
interface GetLoadContextArgs {
  request: Request
  context: {
    cloudflare: AppLoadContext['cloudflare']
    hono: { context: Context }
  }
}

/**
 * secureHeaders が生成した nonce を React Router 側へ引き渡し、<Scripts> 等のインラインscriptを許可する。
 */
export function getLoadContext({ context }: GetLoadContextArgs): AppLoadContext {
  return {
    ...context,
    nonce: context.hono.context.get('secureHeadersNonce'),
  }
}
