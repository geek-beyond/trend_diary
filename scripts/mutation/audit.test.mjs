import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { delimiter, join } from 'node:path'
import { test } from 'node:test'

const script = new URL('./audit.mjs', import.meta.url)
function run(project, exitCode = 0) {
  const dir = mkdtempSync(join(tmpdir(), 'mutation-audit-'))
  try {
    const capture = join(dir, 'args.json')
    writeFileSync(
      join(dir, 'pnpm'),
      `#!/usr/bin/env node\nrequire('node:fs').writeFileSync(process.env.AUDIT_CAPTURE, JSON.stringify({ args: process.argv.slice(2), nodeEnv: process.env.NODE_ENV })); process.exit(${exitCode})\n`,
      { mode: 0o755 },
    )
    const result = spawnSync(process.execPath, [script.pathname, project], {
      cwd: dir,
      env: {
        ...process.env,
        PATH: `${dir}${delimiter}${process.env.PATH}`,
        AUDIT_CAPTURE: capture,
      },
      encoding: 'utf8',
    })
    return {
      ...result,
      ...(result.status === 1 ? { args: [] } : JSON.parse(readFileSync(capture, 'utf8'))),
    }
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

test('共有7パッケージ・web両層・cronを差分指定なしの全件kill matrixで調査する', () => {
  for (const project of [
    'std',
    'authentication',
    'datastore',
    'domain',
    'logger',
    'notification',
    'runtime',
    'web-client',
    'web-server',
    'cron',
  ]) {
    const { status, args, nodeEnv } = run(project)
    assert.equal(status, 0)
    assert.equal(nodeEnv, 'test')
    assert.ok(args.includes('--full-dry-run'))
    assert.ok(args.includes('--kill-matrix'))
    assert.ok(!args.includes('--since'))
    assert.ok(!args.includes('--time-budget'))
    assert.ok(args.includes('**/test*/**'))
    assert.ok(args.includes('json'))
    assert.ok(args.includes('html'))
    if (project === 'web-server') {
      assert.ok(args.some((arg) => arg.endsWith('vitest.mutation.server.config.ts')))
      assert.ok(args.includes('src/middleware/**/*.ts'))
    }
  }
})

test('未知の対象はmutatorを起動せず失敗する', () => {
  const result = run('unknown')
  assert.equal(result.status, 1)
  assert.match(result.stderr, /対象を指定/)
})

test('baseline失敗を成功に変換しない', () => {
  assert.equal(run('web-server', 4).status, 4)
})
