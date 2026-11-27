import { createHash } from 'node:crypto'
import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  readdirSync,
  writeFileSync,
} from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { projects } from './projects.mjs'

export const categories = [
  'survived',
  'noCoverage',
  'duplicates',
  'subsumed',
  'noKills',
  'timeout',
  'incomplete',
]
function canonical(value) {
  if (Array.isArray(value))
    return value
      .map(canonical)
      .toSorted((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)))
  if (value && typeof value === 'object')
    return Object.fromEntries(
      Object.keys(value)
        .filter((key) => key !== 'projectRoot')
        .toSorted()
        .map((key) => [key, canonical(value[key])]),
    )
  return value
}
const hash = (value) =>
  createHash('sha256')
    .update(JSON.stringify(canonical(value)))
    .digest('hex')
const text = (value) =>
  String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('|', '&#124;')
    .replaceAll('\n', ' ')
const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'))

function classifyMutant(mutant, statuses) {
  let category = statuses[mutant.status]
  if (
    mutant.status === 'Killed' &&
    (!mutant.killedBy?.length || mutant.killedBy.some((id) => !id.includes('#')))
  )
    category = 'incomplete'
  if (!category && !['Killed', 'Ignored', 'CompileError'].includes(mutant.status))
    category = 'incomplete'
  return category
}

function sourceFragment(source, location) {
  if (typeof source !== 'string' || !location) return null
  const { start, end } = location
  const lines = source.split('\n').slice(start.line - 1, end.line)
  if (lines.length === 0) return null
  if (start.line === end.line) return lines[0].slice(start.column - 1, end.column - 1)
  lines[0] = lines[0].slice(start.column - 1)
  lines[lines.length - 1] = lines.at(-1).slice(0, end.column - 1)
  return lines.join('\n')
}

function collectMutants(project, report, add) {
  const statuses = {
    Survived: 'survived',
    NoCoverage: 'noCoverage',
    Timeout: 'timeout',
    RuntimeError: 'incomplete',
    NotRun: 'incomplete',
    Pending: 'incomplete',
  }
  let incompleteMutants = 0
  for (const [file, data] of Object.entries(report.files)) {
    if (!Array.isArray(data.mutants)) throw new Error(`${project}: ${file}にmutantsがありません`)
    for (const mutant of data.mutants) {
      const category = classifyMutant(mutant, statuses)
      if (!category) continue
      if (category === 'incomplete') incompleteMutants++
      add(category, mutant.id, {
        file,
        location: mutant.location,
        mutantId: mutant.id,
        mutator: mutant.mutatorName,
        replacement: mutant.replacement,
        original: sourceFragment(data.source, mutant.location),
        status: mutant.status,
        reason:
          mutant.statusReason ??
          (category === 'incomplete'
            ? 'moduleロード失敗またはテストファイル単位の失敗を含むため、完全なテスト単位比較ではありません。'
            : null),
        coveredBy: mutant.coveredBy ?? [],
        killedBy: mutant.killedBy ?? [],
      })
    }
  }
  return incompleteMutants
}

function testKills(report) {
  const kills = new Map()
  for (const [file, data] of Object.entries(report.files)) {
    for (const mutant of data.mutants) {
      if (mutant.status !== 'Killed' || mutant.killedBy?.some((id) => !id.includes('#'))) continue
      const detail = {
        mutantId: mutant.id,
        file,
        location: mutant.location,
        original: sourceFragment(data.source, mutant.location),
        replacement: mutant.replacement,
      }
      for (const test of mutant.killedBy ?? []) {
        if (!kills.has(test)) kills.set(test, [])
        kills.get(test).push(detail)
      }
    }
  }
  return kills
}

function collectMatrix(report, add, incompleteMutants, result) {
  const kills = testKills(report)
  for (const category of ['duplicates', 'subsumed']) {
    for (const item of report.killMatrix[category]) {
      const test = item.test ?? item.tests[0]
      add(category, hash(item).slice(0, 16), { ...item, killedMutants: kills.get(test) ?? [] })
    }
  }
  for (const test of report.killMatrix.noKills) add('noKills', hash(test).slice(0, 16), { test })
  for (const warning of report.warnings ?? [])
    add(
      'incomplete',
      hash(warning).slice(0, 16),
      typeof warning === 'string' ? { reason: warning } : warning,
    )
  checkMatrixCompletion(report, add, incompleteMutants, result)
}

function checkMatrixCompletion(report, add, incompleteMutants, result) {
  const matrixIncomplete = report.killMatrix.mutants?.incomplete
  if (
    !Number.isInteger(matrixIncomplete) ||
    !Number.isInteger(report.killMatrix.mutants?.timeout) ||
    !Number.isInteger(report.killMatrix.mutants?.full)
  ) {
    result.issues.push('kill matrixの完了件数が不明です。')
  } else if (matrixIncomplete > incompleteMutants) {
    // 公開JSONにmatrixフラグが無い場合も、未比較分を0件として隠さないため。
    add('incomplete', 'unattributed-matrix', {
      count: matrixIncomplete - incompleteMutants,
      reason:
        'JSONにテスト単位の完全な対応表がない未比較変異。raw reportとログを確認してください。',
    })
  }
}

function executionIssues(result, run = {}, expectedRevision) {
  run ??= {}
  if (!run.finishedAt || run.exitCode !== 0)
    result.issues.push('正常終了した実行記録がありません。')
  if (expectedRevision && (run.revision !== expectedRevision || run.worktreeDirty))
    result.issues.push('期待するコミットの結果ではありません。')
  if (result.counts.timeout || result.counts.incomplete)
    result.issues.push('timeoutまたはincompleteにより比較が完了していません。')
}

function validMeasurement(report) {
  return (
    Object.keys(report.files).length > 0 &&
    ['full', 'incomplete', 'timeout'].every(
      (key) =>
        Number.isInteger(report.killMatrix.mutants?.[key]) && report.killMatrix.mutants[key] >= 0,
    )
  )
}

function validExecution(run, expectedRevision) {
  if (!run?.finishedAt || run.exitCode !== 0) return false
  return !expectedRevision || (run.revision === expectedRevision && !run.worktreeDirty)
}

function emptyProject(project, run) {
  return {
    project,
    root: projects[project].root,
    revision: run?.revision ?? null,
    run: run ?? null,
    state: 'missing',
    executionValid: false,
    reportValid: false,
    issues: [],
    counts: Object.fromEntries(categories.map((c) => [c, null])),
    findings: [],
  }
}

export function summarizeProject(project, report, run, expectedRevision, review = {}) {
  const result = emptyProject(project, run)
  if (!report) {
    result.issues.push('mutation.jsonがありません。未実行・失敗・中断を確認してください。')
    return result
  }
  if (
    !report.files ||
    typeof report.files !== 'object' ||
    !report.killMatrix ||
    !categories.slice(2, 5).every((c) => Array.isArray(report.killMatrix[c]))
  ) {
    result.state = 'invalid'
    result.issues.push('変異一覧またはkill matrixが欠けています。')
    return result
  }
  result.executionValid = validExecution(run, expectedRevision)
  result.reportValid = validMeasurement(report)
  const reportHash = hash(report)
  if (Object.keys(report.files).length === 0)
    result.issues.push('変異対象のソースがありません。対象漏れを確認してください。')
  const add = (category, key, detail) => {
    const id = `${project}/${category}/${key}`
    const finding = {
      id,
      project,
      category,
      ...detail,
      evidenceHash: hash([reportHash, category, key, detail]),
    }
    const decision = review[id]
    finding.review =
      decision?.evidenceHash === finding.evidenceHash &&
      ['maintain', 'fix', 'defer'].includes(decision.action) &&
      decision.reason?.trim() &&
      decision.references?.length
        ? decision
        : { action: 'unreviewed' }
    result.findings.push(finding)
  }
  const incompleteMutants = collectMutants(project, report, add)
  collectMatrix(report, add, incompleteMutants, result)
  result.counts = Object.fromEntries(
    categories.map((category) => [
      category,
      result.findings
        .filter((f) => f.category === category)
        .reduce((sum, f) => sum + (f.count ?? 1), 0),
    ]),
  )
  result.reportHash = reportHash
  result.matrix = report.killMatrix.mutants
  executionIssues(result, run, expectedRevision)
  result.state = result.issues.length ? 'partial' : 'complete'
  return result
}

function findReports(dir, project, filename = 'mutation.json') {
  if (!existsSync(dir)) return []
  const paths = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) paths.push(...findReports(path, project, filename))
    else if (entry.name === filename && dirname(path).split('/').at(-1) === project)
      paths.push(path)
  }
  return paths
}

export function reviewDecisions(ledger) {
  return Object.fromEntries(
    Object.entries(ledger.decisions ?? {}).map(([id, decision]) => [
      id,
      { ...ledger.groups?.[decision.group], ...decision },
    ]),
  )
}

export function aggregate(dir, { expectedRevision, review = {} } = {}) {
  const results = Object.keys(projects).map((project) => {
    const paths = findReports(dir, project)
    if (paths.length > 1)
      return {
        ...summarizeProject(project),
        state: 'invalid',
        issues: ['同じ対象のレポートが複数あります。実行ごとに取得先を分けてください。'],
      }
    try {
      const path = paths[0]
      const runPath = path
        ? join(dirname(path), 'run.json')
        : findReports(dir, project, 'run.json')[0]
      return summarizeProject(
        project,
        path ? readJson(path) : null,
        runPath && existsSync(runPath) ? readJson(runPath) : null,
        expectedRevision,
        review,
      )
    } catch (error) {
      return { ...summarizeProject(project), state: 'invalid', issues: [error.message] }
    }
  })
  return {
    schemaVersion: 1,
    expectedRevision: expectedRevision ?? null,
    projects: results,
    findings: results.flatMap((r) => r.findings),
    complete: results.every((r) => r.state === 'complete'),
    reviewComplete:
      results.every(
        (r) => r.executionValid && r.reportValid && !['missing', 'invalid'].includes(r.state),
      ) &&
      results.flatMap((r) => r.findings).every((finding) => finding.review.action !== 'unreviewed'),
  }
}

function findingSource(finding, result, repository) {
  if (!finding.file) return ''
  const file = `${result.root}/${finding.file}`
  if (!repository || !result.revision || result.run?.worktreeDirty) return text(file)
  const line = finding.location?.start.line
  const suffix = line ? `#L${line}` : ''
  return `[${text(file)}${line ? `:${line}` : ''}](https://github.com/${repository}/blob/${result.revision}/${file}${suffix})`
}

function findingTests(finding) {
  return [
    finding.test,
    ...(finding.tests ?? []),
    ...(finding.by ?? []),
    ...(finding.coveredBy ?? []),
  ].filter(Boolean)
}

function findingMarkdown(finding, result, repository) {
  const lines = []
  const source = findingSource(finding, result, repository)
  lines.push(
    `- **${finding.id}** ${source} ${text(finding.mutator ?? '')} ${finding.replacement !== undefined ? `→ ${text(finding.replacement)}` : ''}`,
  )
  for (const test of findingTests(finding)) lines.push(`  - ${text(test)}`)
  if (finding.reason) lines.push(`  - ${text(finding.reason)}`)
  lines.push(
    `  - 判断: ${text(finding.review.action)}${finding.review.reason ? ` — ${text(finding.review.reason)}` : ''}`,
  )
  return lines
}

const unreviewedCount = (result) =>
  ['missing', 'invalid'].includes(result.state)
    ? '—'
    : result.findings.filter((f) => f.review.action === 'unreviewed').length

export function markdown(summary, repository = process.env.GITHUB_REPOSITORY) {
  const lines = [
    '# Mutation audit',
    '',
    '0は取得したレポート内の検出なし、—は結果なし・形式不正です。partialは未完了・旧結果を含み、0でも調査完了とは限りません。',
    '',
    'survived/noCoverage/timeoutは変異数、duplicatesはテスト群数、subsumed/noKillsはテスト数、incompleteは未比較変異・実行警告の件数です。',
    '',
    '| 対象 | 調査状態 | コミット | ' + categories.join(' | ') + ' | 未判断 |',
    '| --- | --- | --- | ' + categories.map(() => '---:').join(' | ') + ' | ---: |',
  ]
  for (const result of summary.projects) {
    lines.push(
      `| ${result.project} | ${result.state} | ${result.revision?.slice(0, 8) ?? '不明'} | ${categories.map((c) => result.counts[c] ?? '—').join(' | ')} | ${unreviewedCount(result)} |`,
    )
  }
  lines.push(
    '',
    '全件の構造化データはartifactのsummary.jsonを参照してください。維持・保留の根拠も同じIDで追跡します。',
    '',
  )
  for (const result of summary.projects) {
    lines.push(`<details><summary>${result.project}: ${result.findings.length}項目</summary>`, '')
    for (const issue of result.issues) lines.push(`- ${text(issue)}`)
    for (const category of categories) {
      const findings = result.findings.filter((f) => f.category === category)
      if (!findings.length) continue
      lines.push('', `### ${category}`, '')
      for (const finding of findings) {
        lines.push(...findingMarkdown(finding, result, repository))
      }
    }
    lines.push('', '</details>', '')
  }
  return lines.join('\n')
}

export function jobSummary(summary, { maxBytes = 950_000 } = {}) {
  const full = markdown(summary)
  if (Buffer.byteLength(full) <= maxBytes) return full

  const header = full.split('<details>')[0]
  const lines = [
    header,
    '詳細がサイズ制限を超えたため全項目のIDを表示します。変異・テスト・判断の詳細はartifactのsummary.json・summary.mdを参照してください。',
    '',
  ]
  for (const result of summary.projects) {
    lines.push(
      `<details><summary>${result.project}: ${result.findings.length}項目のID</summary>`,
      '',
    )
    for (const category of categories) {
      const findings = result.findings.filter((finding) => finding.category === category)
      if (!findings.length) continue
      lines.push(`### ${category}`, '', ...findings.map((finding) => `- \`${finding.id}\``), '')
    }
    lines.push('</details>', '')
  }
  const inventory = lines.join('\n')
  return Buffer.byteLength(inventory) <= maxBytes
    ? inventory
    : header +
        '\nID一覧もサイズ制限を超えています。全検出項目はartifactのsummary.json・summary.mdから取得してください。\n'
}

if (
  process.argv[1] &&
  existsSync(process.argv[1]) &&
  realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))
) {
  const dir = resolve(process.argv[2] ?? 'mutation-audit')
  const output = resolve(process.argv[3] ?? join(dir, 'summary'))
  const reviewFile = resolve('docs/mutation/review.json')
  const summary = aggregate(dir, {
    expectedRevision: process.env.AUDIT_REVISION,
    review: existsSync(reviewFile) ? reviewDecisions(readJson(reviewFile)) : {},
  })
  mkdirSync(output, { recursive: true })
  writeFileSync(join(output, 'summary.json'), JSON.stringify(summary, null, 2) + '\n')
  const report = markdown(summary)
  writeFileSync(join(output, 'summary.md'), report)
  if (process.env.GITHUB_STEP_SUMMARY) {
    // Job Summaryの上限で全件JSONまで失わないよう、完全版は常にartifactに残す。
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, jobSummary(summary))
  }
  process.stdout.write(
    `${summary.projects.length}対象 / ${summary.findings.length}項目: ${output}\n`,
  )
  if (summary.projects.some((r) => ['missing', 'invalid'].includes(r.state))) process.exitCode = 1
}
