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
          outcome: project === 'domain' ? 'failure' : 'success',
        }),
      )
    }
    writeFileSync(join(dir, 'logger/mutation.json'), '{broken')
    const projects = ['std', 'domain', 'logger', 'cron'].map((project) => ({ project }))
    const results = aggregate(dir, projects, 'abc')
    assert.equal(results.length, 4)
    assert.deepEqual(results.find((r) => r.project === 'std').report, report)
    assert.equal(results.find((r) => r.project === 'std').counts.survived, 0)
    assert.equal(results.find((r) => r.project === 'std').state, 'complete')
    assert.equal(results.find((r) => r.project === 'domain').state, 'partial')
    assert.equal(results.find((r) => r.project === 'logger').state, 'invalid')
    assert.equal(results.find((r) => r.project === 'cron').counts, null)
    assert.match(markdown(results), /mutation.json/)
    assert.equal(aggregate(dir, projects, 'other')[0].state, 'partial')
    report.files['a.ts'].mutants = ['Survived', 'NoCoverage', 'Timeout', 'Pending'].map(
      (status) => ({ id: status, status }),
    )
    report.killMatrix.duplicates = [{ tests: ['a#one', 'a#two'], kills: 1 }]
    report.killMatrix.subsumed = [{ test: 'a#one', by: ['a#three'], kills: 1 }]
    report.killMatrix.noKills = ['a#zero']
    report.killMatrix.mutants = { full: 1, timeout: 1, incomplete: 1 }
    report.warnings = ['upstream warning']
    writeFileSync(join(dir, 'std/mutation.json'), JSON.stringify(report))
    const measured = aggregate(dir, projects, 'abc')[0]
    assert.deepEqual(measured.counts, {
      survived: 1,
      noCoverage: 1,
      timeout: 1,
      incomplete: 1,
      duplicates: 1,
      subsumed: 1,
      noKills: 1,
      warning: 1,
    })
    assert.equal(measured.state, 'partial')
    assert.deepEqual(measured.report, report)
    report.files['a.ts'].mutants = []
    report.killMatrix.mutants = { full: 0, timeout: 0, incomplete: 0 }
    writeFileSync(join(dir, 'std/mutation.json'), JSON.stringify(report))
    assert.equal(aggregate(dir, projects, 'abc')[0].state, 'partial')
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})
