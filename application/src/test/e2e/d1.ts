import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Miniflare } from 'miniflare'

const APP_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..')

const D1_DATABASE_ID = '15dfd380-5a78-4237-8e59-49640c2e954f'

export function createTestMiniflare(): Miniflare {
  return new Miniflare({
    modules: true,
    script: 'export default {};',
    d1Databases: { DB: D1_DATABASE_ID },
    defaultPersistRoot: resolve(APP_ROOT, '.wrangler/state/v3'),
  })
}
