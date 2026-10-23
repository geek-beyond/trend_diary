import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import test from 'node:test'

const serverDir = new URL('../apps/web/build/server/', import.meta.url)
const clientDir = new URL('../apps/web/build/client/', import.meta.url)

test('SSR のソースマップから元の TypeScript / TSX ソースを解決できる', () => {
  const maps = readdirSync(serverDir, { recursive: true }).filter((file) => file.endsWith('.map'))
  assert.ok(maps.length > 0, 'SSR ビルドにソースマップが必要です')
  const sources = maps.flatMap((file) => {
    const map = JSON.parse(readFileSync(new URL(file, serverDir), 'utf8'))
    return map.sources.map((source, index) => ({ source, content: map.sourcesContent?.[index] }))
  })
  const original = readFileSync(new URL('../apps/web/src/client/root.tsx', import.meta.url), 'utf8')
  assert.ok(
    sources.some(
      ({ source, content }) => source.endsWith('/src/client/root.tsx') && content === original,
    ),
  )
})

test('公開するクライアントアセットにはソースマップとその参照を含めない', () => {
  const files = readdirSync(clientDir, { recursive: true })
  assert.equal(
    files.some((file) => file.endsWith('.map')),
    false,
  )
  for (const asset of files.filter((file) => /\.(js|css)$/.test(file))) {
    assert.doesNotMatch(
      readFileSync(new URL(asset, clientDir), 'utf8'),
      /[#@] sourceMappingURL=/,
      asset,
    )
  }
})
