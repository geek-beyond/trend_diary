import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, realpathSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { test } from 'node:test'

test('連続実行で前回のmoduleエラーを今回の判定へ混ぜない', async () => {
  const require = createRequire(import.meta.resolve('@mizchi/mutator'))
  const { createSession } = await import(require.resolve('@mizchi/mutator-vitest'))
  const dir = realpathSync(mkdtempSync(join(tmpdir(), 'mutator-file-errors-')))
  const previousExitCode = process.exitCode
  let session
  try {
    symlinkSync(resolve('packages/domain/node_modules'), join(dir, 'node_modules'), 'dir')
    mkdirSync(join(dir, 'src'))
    writeFileSync(join(dir, 'package.json'), '{"type":"module"}')
    writeFileSync(
      join(dir, 'vitest.config.ts'),
      `import {defineConfig} from 'vitest/config';export default defineConfig({test:{include:['src/*.test.ts']}})`,
    )
    writeFileSync(
      join(dir, 'src/a.ts'),
      `export const formatted = new Intl.DateTimeFormat('en',{year:'numeric'}).format(new Date(0))`,
    )
    writeFileSync(
      join(dir, 'src/a.test.ts'),
      `import {it,expect} from 'vitest';import {formatted} from './a';it('A形式',()=>expect(formatted).toBe('1970'))`,
    )
    writeFileSync(join(dir, 'src/b.ts'), `export const calculate=(value:number)=>value+1`)
    writeFileSync(
      join(dir, 'src/b.test.ts'),
      `import {it,expect} from 'vitest';import {calculate} from './b';it('B加算',()=>expect(calculate(3)).toBe(4))`,
    )
    session = await createSession({
      root: dir,
      configFile: join(dir, 'vitest.config.ts'),
      include: (file) => /src\/[ab]\.ts$/.test(file),
      maxWorkers: 1,
      earlyExit: false,
    })
    const dry = await session.dryRun()
    const mutants = session.mutants()
    const invalidFormat = mutants.find((m) => m.original === "'numeric'")
    const wrongAddition = mutants.find((m) => m.original === 'value+1')
    assert.ok(invalidFormat)
    assert.ok(wrongAddition)
    const options = { timeoutMs: 10000, earlyExit: false }
    const first = await session.runMutant(
      invalidFormat.key,
      dry.tests.filter((t) => t.id.includes('a.test')).map((t) => t.id),
      { ...options, isStatic: true },
    )
    const second = await session.runMutant(
      wrongAddition.key,
      dry.tests.filter((t) => t.id.includes('b.test')).map((t) => t.id),
      options,
    )
    assert.equal(first.status, 'RuntimeError')
    assert.equal(second.status, 'Killed')
    assert.deepEqual(second.killedBy, ['src/b.test.ts#B加算'])
  } finally {
    await session?.close()
    rmSync(dir, { recursive: true, force: true })
    process.exitCode = previousExitCode
  }
})
