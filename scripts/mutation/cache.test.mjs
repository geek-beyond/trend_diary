import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { test } from 'node:test'

const execute = (args) => {
  const result = spawnSync(
    'pnpm',
    args[0] === 'vitest' ? ['--filter', '@trend-diary/domain', 'exec', ...args] : ['exec', ...args],
    {
      env: { ...process.env, NODE_ENV: 'test' },
      encoding: 'utf8',
      timeout: 60_000,
    },
  )
  assert.equal(result.status, 0, result.stdout + result.stderr)
}

test('通常テスト・限定調査の変換キャッシュが全件調査のcoverageを欠落させない', () => {
  const dir = realpathSync(mkdtempSync(join(tmpdir(), 'mutator-cache-')))
  try {
    symlinkSync(resolve('packages/domain/node_modules'), join(dir, 'node_modules'), 'dir')
    mkdirSync(join(dir, 'src'))
    writeFileSync(join(dir, 'package.json'), '{"type":"module"}')
    writeFileSync(
      join(dir, 'vitest.config.ts'),
      `import { defineConfig } from 'vitest/config'; export default defineConfig({test:{fsModuleCache:true,include:['src/*.test.ts']}})`,
    )
    for (const [name, offset] of [
      ['a', 1],
      ['b', 2],
    ]) {
      writeFileSync(
        join(dir, `src/${name}.ts`),
        `export const calculate = (value: number) => value + ${offset}`,
      )
      writeFileSync(
        join(dir, `src/${name}.test.ts`),
        `import {it,expect} from 'vitest'; import {calculate} from './${name}'; it('値を加算する',()=>expect(calculate(3)).toBe(${3 + offset}))`,
      )
    }

    execute(['vitest', 'run', '--root', dir, '--config', join(dir, 'vitest.config.ts')])
    for (const include of ['src/*.ts', 'src/a.ts', 'src/*.ts']) {
      execute([
        'mutator',
        '--root',
        dir,
        '--include',
        include,
        '--no-typecheck',
        '--full-dry-run',
        '--kill-matrix',
        '--reporter',
        'json',
        '-j',
        '1',
      ])
      const report = JSON.parse(readFileSync(join(dir, '.mutator/report/mutation.json'), 'utf8'))
      const rows = Object.values(report.files).flatMap((file) => file.mutants)
      assert.ok(rows.length > 0)
      assert.ok(rows.every((row) => row.status !== 'NoCoverage'))
      assert.ok(rows.some((row) => row.status === 'Killed'))
      if (include === 'src/*.ts')
        assert.deepEqual(Object.keys(report.files).toSorted(), ['src/a.ts', 'src/b.ts'])
    }
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('連続実行は今回のファイルだけを判定し、ロード時間も予算に含める', async () => {
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
      `import {defineConfig} from 'vitest/config';export default defineConfig({test:{include:['src/*.test.ts'],setupFiles:['setup.ts']}})`,
    )
    writeFileSync(join(dir, 'setup.ts'), `await new Promise(resolve => setTimeout(resolve, 200))`)
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
      { ...options, timeoutMs: 1 },
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
