import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { aggregate, jobSummary, markdown, summarizeProject } from './summarize.mjs'

const run = { revision: 'abc123', finishedAt: '2026-11-27', exitCode: 0 }
const mutant = (id, status, extra = {}) => ({
  id,
  status,
  mutatorName: 'BlockStatement',
  replacement: '{}',
  location: { start: { line: 3, column: 1 }, end: { line: 4, column: 1 } },
  coveredBy: ['src/a.test.ts#契約'],
  killedBy: status === 'Killed' ? ['src/a.test.ts#契約'] : [],
  ...extra,
})
const report = (mutants = [mutant('killed', 'Killed')]) => ({
  files: { 'src/a.ts': { source: 'a()', mutants } },
  killMatrix: {
    mutants: { full: 1, incomplete: 0, timeout: 0 },
    duplicates: [],
    subsumed: [],
    noKills: [],
  },
})

test('7分類を区別し、変異ID・位置・テストIDを全件保持する', () => {
  const raw = report(['Survived', 'NoCoverage', 'Timeout', 'RuntimeError'].map((s) => mutant(s, s)))
  raw.killMatrix.duplicates = [{ tests: ['a#one', 'b#two'], kills: 2 }]
  raw.killMatrix.subsumed = [{ test: 'a#one', by: ['c#three'], kills: 1 }]
  raw.killMatrix.noKills = ['c#zero']
  raw.killMatrix.mutants = { full: 1, incomplete: 1, timeout: 1 }
  const result = summarizeProject('std', raw, run, 'abc123')
  assert.deepEqual(result.counts, {
    survived: 1,
    noCoverage: 1,
    duplicates: 1,
    subsumed: 1,
    noKills: 1,
    timeout: 1,
    incomplete: 1,
  })
  assert.equal(result.findings.length, 7)
  assert.equal(result.findings[0].mutantId, 'Survived')
  assert.equal(result.findings[0].location.start.line, 3)
  const md = markdown({ projects: [result] }, 'owner/repo')
  assert.match(md, /blob\/abc123\/packages\/std\/src\/a.ts#L3/)
  for (const name of ['a#one', 'b#two', 'c#three', 'c#zero']) assert.ok(md.includes(name))
})

test('レポート欠落・JSON不正・matrix欠落を0件にしない', () => {
  assert.equal(summarizeProject('std').counts.survived, null)
  assert.equal(summarizeProject('std', { files: {} }).counts.duplicates, null)
  const dir = mkdtempSync(join(tmpdir(), 'mutation-summary-'))
  try {
    mkdirSync(join(dir, 'std'))
    writeFileSync(join(dir, 'std/mutation.json'), '{broken')
    const summary = aggregate(dir)
    assert.equal(summary.projects.length, 10)
    assert.equal(summary.projects.find((p) => p.project === 'std').state, 'invalid')
    assert.ok(summary.projects.every((p) => p.counts.survived === null))
    assert.equal(summary.complete, false)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('正常終了した検出0件と、中断・旧コミット・実行記録なしを区別する', () => {
  assert.equal(summarizeProject('std', report(), run, 'abc123').state, 'complete')
  assert.equal(summarizeProject('std', report(), run).counts.survived, 0)
  for (const meta of [undefined, { ...run, finishedAt: null }, { ...run, exitCode: 4 }])
    assert.equal(summarizeProject('std', report(), meta).state, 'partial')
  assert.equal(summarizeProject('std', report(), run, 'other').state, 'partial')
})

test('テストファイル単位のkill・未実行・帰属不明のmatrixを未完了として残す', () => {
  const raw = report([
    mutant('file', 'Killed', { killedBy: ['a.test.ts'] }),
    mutant('pending', 'NotRun'),
  ])
  raw.killMatrix.mutants.incomplete = 3
  const result = summarizeProject('std', raw, run)
  assert.equal(result.counts.incomplete, 3)
  assert.ok(result.findings.some((f) => f.id.endsWith('/unattributed-matrix')))
  assert.equal(result.state, 'partial')
})

test('結果が変わった項目は以前の判断を適用せず未判断に戻す', () => {
  const raw = report([mutant('s', 'Survived')])
  const finding = summarizeProject('std', raw, run).findings[0]
  const review = {
    [finding.id]: {
      evidenceHash: finding.evidenceHash,
      action: 'maintain',
      reason: '公開契約を検証する別の入力',
      references: ['src/a.test.ts'],
    },
  }
  assert.equal(
    summarizeProject('std', raw, run, undefined, review).findings[0].review.action,
    'maintain',
  )
  raw.files['src/a.ts'].source = 'changed()'
  assert.equal(
    summarizeProject('std', raw, run, undefined, review).findings[0].review.action,
    'unreviewed',
  )
})

test('同じ対象の別実行を混ぜた場合は集約を拒否する', () => {
  const dir = mkdtempSync(join(tmpdir(), 'mutation-summary-'))
  try {
    for (const name of ['one', 'two']) {
      mkdirSync(join(dir, name, 'std'), { recursive: true })
      writeFileSync(join(dir, name, 'std/mutation.json'), JSON.stringify(report()))
    }
    assert.equal(aggregate(dir).projects[0].state, 'invalid')
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('baseline失敗でレポート未生成でも実行記録を保持する', () => {
  const dir = mkdtempSync(join(tmpdir(), 'mutation-summary-'))
  try {
    mkdirSync(join(dir, 'std'))
    writeFileSync(join(dir, 'std/run.json'), JSON.stringify({ ...run, exitCode: 4 }))
    const result = aggregate(dir).projects[0]
    assert.equal(result.state, 'missing')
    assert.equal(result.run.exitCode, 4)
    assert.equal(result.counts.survived, null)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('ソースが0件の場合は検出0件でも調査完了としない', () => {
  const raw = report()
  raw.files = {}
  assert.equal(summarizeProject('std', raw, run).state, 'partial')
})

test('ローカルとCIの絶対パス・実行順の違いだけでは判断を失効させない', () => {
  const raw = report([mutant('s', 'Survived', { coveredBy: ['b#two', 'a#one'] })])
  raw.projectRoot = '/Users/local/project'
  const finding = summarizeProject('std', raw, run).findings[0]
  const review = {
    [finding.id]: {
      evidenceHash: finding.evidenceHash,
      action: 'maintain',
      reason: '契約を維持',
      references: ['src/a.ts'],
    },
  }
  raw.projectRoot = '/home/runner/project'
  raw.files['src/a.ts'].mutants[0].coveredBy.reverse()
  assert.equal(
    summarizeProject('std', raw, run, undefined, review).findings[0].review.action,
    'maintain',
  )
})

test('同じ根拠の判断をグループ化しても、列挙した項目だけに適用する', async () => {
  const { reviewDecisions } = await import('./summarize.mjs')
  const result = reviewDecisions({
    groups: {
      contract: { action: 'maintain', reason: '異なるAPIの契約', references: ['src/a.test.ts'] },
    },
    decisions: { one: { group: 'contract', evidenceHash: 'hash' } },
  })
  assert.equal(result.one.reason, '異なるAPIの契約')
  assert.equal(result.one.evidenceHash, 'hash')
  assert.equal(result.two, undefined)
})

test('集約JSONだけで元の式と置換後の式を確認できる', () => {
  const raw = report([
    mutant('condition', 'Survived', {
      location: { start: { line: 2, column: 5 }, end: { line: 2, column: 10 } },
      replacement: 'false',
    }),
  ])
  raw.files['src/a.ts'].source = '\nif (value) return 1'
  const finding = summarizeProject('std', raw, run).findings[0]
  assert.equal(finding.original, 'value')
  assert.equal(finding.replacement, 'false')
})

test('旧コミット・未コミット変更の結果をCIの判断完了に使わず、誤ったソースリンクも作らない', () => {
  const dirty = { ...run, worktreeDirty: true }
  assert.equal(summarizeProject('std', report(), dirty, 'abc123').executionValid, false)
  assert.equal(summarizeProject('std', report(), run, 'different').executionValid, false)
  assert.equal(summarizeProject('std', report(), dirty).executionValid, true)
  assert.doesNotMatch(
    markdown(
      { projects: [summarizeProject('std', report([mutant('s', 'Survived')]), dirty)] },
      'owner/repo',
    ),
    /github.com/,
  )
})

test('duplicates・subsumedから同じkill setを作った変異の内容まで追跡できる', () => {
  const raw = report([mutant('shared-kill', 'Killed', { killedBy: ['a#one', 'b#two'] })])
  raw.killMatrix.duplicates = [{ tests: ['a#one', 'b#two'], kills: 1 }]
  raw.killMatrix.subsumed = [{ test: 'a#one', by: ['b#two'], kills: 1 }]
  const result = summarizeProject('std', raw, run)
  for (const finding of result.findings) {
    assert.equal(finding.killedMutants[0].mutantId, 'shared-kill')
    assert.equal(finding.killedMutants[0].file, 'src/a.ts')
    assert.equal(finding.killedMutants[0].replacement, '{}')
  }
})

test('構造不明・対象ソースなしのレポートを判断完了に使わない', () => {
  assert.equal(summarizeProject('std', { ...report(), files: {} }, run).reportValid, false)
  const raw = report()
  delete raw.killMatrix.mutants
  assert.equal(summarizeProject('std', raw, run).reportValid, false)
})

test('文字列とオブジェクトの実行警告を、理由を失わずincompleteとして出力する', () => {
  const raw = report()
  raw.warnings = ['runner interrupted', { reason: 'coverage unavailable', file: 'src/a.ts' }]
  const result = summarizeProject('std', raw, run)
  assert.equal(result.counts.incomplete, 2)
  assert.deepEqual(
    result.findings.map((finding) => finding.reason),
    ['runner interrupted', 'coverage unavailable'],
  )
  assert.equal(result.findings[1].file, 'src/a.ts')
  assert.equal(Object.hasOwn(result.findings[0], '0'), false)
  assert.match(markdown({ projects: [result] }), /runner interrupted/)
})

test('大きなJob Summaryでも全分類の検出IDを残し、完全版の取得先を示す', () => {
  const raw = report(
    ['Survived', 'NoCoverage', 'Timeout', 'RuntimeError'].map((status) => mutant(status, status)),
  )
  raw.warnings = [{ reason: 'large diagnostics '.repeat(2000) }]
  raw.killMatrix.duplicates = [{ tests: ['a#one', 'b#two'], kills: 1 }]
  raw.killMatrix.subsumed = [{ test: 'a#one', by: ['b#two'], kills: 1 }]
  raw.killMatrix.noKills = ['c#zero']
  const result = summarizeProject('std', raw, run)
  const summary = { projects: [result] }
  const compact = jobSummary(summary, { maxBytes: 5000 })
  assert.ok(Buffer.byteLength(markdown(summary)) > 5000)
  assert.ok(Buffer.byteLength(compact) < 5000)
  for (const finding of result.findings) assert.ok(compact.includes(finding.id), finding.id)
  assert.match(compact, /summary.json/)
  assert.match(compact, /incomplete/)
  assert.equal(jobSummary(summary), markdown(summary))
})

test('シンボリックリンク経由のCLIでも全対象の欠落を集約し、成功扱いにしない', () => {
  const dir = mkdtempSync(join(tmpdir(), 'mutation-cli-link-'))
  try {
    const linked = join(dir, 'summarize.mjs')
    symlinkSync(fileURLToPath(new URL('./summarize.mjs', import.meta.url)), linked)
    const output = join(dir, 'summary')
    const result = spawnSync(process.execPath, [linked, join(dir, 'input'), output], {
      encoding: 'utf8',
      env: { ...process.env, GITHUB_STEP_SUMMARY: '' },
    })
    assert.equal(result.status, 1, result.stdout + result.stderr)
    const summary = JSON.parse(readFileSync(join(output, 'summary.json'), 'utf8'))
    assert.equal(summary.projects.length, 10)
    assert.ok(summary.projects.every((project) => project.state === 'missing'))
    assert.ok(summary.projects.every((project) => project.counts.survived === null))
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})
