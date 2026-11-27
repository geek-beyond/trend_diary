import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { aggregate, markdown } from './summarize.mjs'

test('元レポートの全情報を保持し、未取得・0件・中断・不正を区別する', () => {
  const dir = mkdtempSync(join(tmpdir(), 'mutation-summary-'))
  try {
    const report = {
      files: { 'a.ts': { source: 'original', mutants: [] } },
      killMatrix: {
        duplicates: [],
        subsumed: [],
        noKills: [],
        mutants: { full: 0, timeout: 0, incomplete: 0 },
      },
      findings: [{ kind: 'upstream-information' }],
    }
    for (const project of ['std', 'domain', 'logger']) {
      mkdirSync(join(dir, project))
      writeFileSync(join(dir, project, 'mutation.json'), JSON.stringify(report))
      writeFileSync(
        join(dir, project, 'run.json'),
        JSON.stringify({
          revision: 'abc',
          finishedAt: 'now',
          exitCode: project === 'domain' ? 4 : 0,
        }),
      )
    }
    writeFileSync(join(dir, 'logger/mutation.json'), '{broken')
    const results = aggregate(dir, 'abc')
    assert.equal(results.length, 10)
    assert.deepEqual(results.find((r) => r.project === 'std').report, report)
    assert.equal(results.find((r) => r.project === 'std').counts.survived, 0)
    assert.equal(results.find((r) => r.project === 'std').state, 'complete')
    assert.equal(results.find((r) => r.project === 'domain').state, 'partial')
    assert.equal(results.find((r) => r.project === 'logger').state, 'invalid')
    assert.equal(results.find((r) => r.project === 'cron').counts, null)
    assert.match(markdown(results), /summary.json/)
    assert.equal(aggregate(dir, 'other')[0].state, 'partial')
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})
