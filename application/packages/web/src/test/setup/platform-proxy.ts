import { fileURLToPath } from 'node:url'
import type { D1Database } from '@cloudflare/workers-types'
import { getPlatformProxy } from 'wrangler'

interface TestPlatformBindings {
  DB: D1Database
}

const proxy = await getPlatformProxy<TestPlatformBindings>({
  configPath: fileURLToPath(new URL('../../../wrangler.toml', import.meta.url)),
  persist: false,
})

export const platformEnv = proxy.env
export const disposePlatformProxy = proxy.dispose
