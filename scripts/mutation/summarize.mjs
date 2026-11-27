import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  writeFileSync,
} from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { projects } from './projects.mjs'

const categories = [
  'survived',
  'noCoverage',
  'duplicates',
  'subsumed',
  'noKills',
  'timeout',
  'incomplete',
]
const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'))

function reportCounts(report) {
  const { files, killMatrix } = report
  if (
    !files ||
    !killMatrix ||
    !['duplicates', 'subsumed', 'noKills'].every((key) => Array.isArray(killMatrix[key]))
  )
    throw new Error('filesまたはkillMatrixが不正です。')
  const mutants = Object.values(files).flatMap((file) => {
    if (!Array.isArray(file.mutants)) throw new Error('mutantsが不正です。')
    return file.mutants
  })
  const count = (status) => mutants.filter((mutant) => mutant.status === status).length
  return {
    survived: count('Survived'),
    noCoverage: count('NoCoverage'),
    duplicates: killMatrix.duplicates.length,
    subsumed: killMatrix.subsumed.length,
    noKills: killMatrix.noKills.length,
    timeout: count('Timeout'),
    incomplete: Math.max(
      killMatrix.mutants?.incomplete ?? 0,
      mutants.filter(
        (mutant) =>
          !['Killed', 'Survived', 'NoCoverage', 'Timeout', 'Ignored', 'CompileError'].includes(
            mutant.status,
          ),
      ).length,
    ),
  }
}

function executionIssues({ report, run, counts }, expectedRevision) {
  const checks = [
    [Object.keys(report.files).length === 0, '対象ソースがありません。'],
    [!run?.finishedAt || run.exitCode !== 0, '正常終了の記録がありません。'],
    [
      expectedRevision && (run?.revision !== expectedRevision || run?.worktreeDirty),
      '期待するコミットの結果ではありません。',
    ],
    [
      !['full', 'timeout', 'incomplete'].every((key) =>
        Number.isInteger(report.killMatrix.mutants?.[key]),
      ),
      'matrixの完了件数が不明です。',
    ],
    [
      [counts.timeout, counts.incomplete, report.warnings?.length].some(Boolean),
      '未完了の比較または実行警告があります。',
    ],
  ]
  return checks.filter(([failed]) => failed).map(([, reason]) => reason)
}

export function aggregate(dir, expectedRevision) {
  return Object.keys(projects).map((project) => {
    const result = { project, state: 'missing', issues: [], counts: null, run: null, report: null }
    try {
      const root = join(dir, project)
      if (existsSync(join(root, 'run.json'))) result.run = readJson(join(root, 'run.json'))
      if (!existsSync(join(root, 'mutation.json'))) {
        result.issues.push('mutation.jsonがありません。')
        return result
      }
      result.report = readJson(join(root, 'mutation.json'))
      result.counts = reportCounts(result.report)
      result.issues = executionIssues(result, expectedRevision)
      result.state = result.issues.length ? 'partial' : 'complete'
    } catch (error) {
      result.state = 'invalid'
      result.counts = null
      result.issues.push(error.message)
    }
    return result
  })
}

export function markdown(results) {
  return [
    '# Mutation audit',
    '',
    '0は取得結果での検出なし、—は結果なし・形式不正です。completeは計測の状態であり、項目の判断完了を意味しません。',
    '',
    '| 対象 | 状態 | ' + categories.join(' | ') + ' |',
    '| --- | --- | ' + categories.map(() => '---:').join(' | ') + ' |',
    ...results.map(
      (result) =>
        `| ${result.project} | ${result.state} | ${categories.map((key) => result.counts?.[key] ?? '—').join(' | ')} |`,
    ),
    '',
    'survived/noCoverage/timeout/incompleteは変異数、duplicatesはテスト群数、subsumed/noKillsはテスト数です。実行警告は元レポートを確認してください。',
    '',
    'Artifact mutation-audit-summaryのsummary.jsonには、対象ごとの元レポートをreport、実行記録をrunとして加工せず収録しています。変異・テスト・警告の全件は元レポートを参照してください。HTMLとログは対象別のmutation-audit-* artifactにあります。',
    '',
    ...results.flatMap((result) => result.issues.map((issue) => `- ${result.project}: ${issue}`)),
    '',
  ].join('\n')
}

if (
  process.argv[1] &&
  existsSync(process.argv[1]) &&
  realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))
) {
  const dir = resolve(process.argv[2] ?? 'mutation-audit')
  const output = resolve(process.argv[3] ?? join(dir, 'summary'))
  const results = aggregate(dir, process.env.AUDIT_REVISION)
  mkdirSync(output, { recursive: true })
  writeFileSync(join(output, 'summary.json'), JSON.stringify(results, null, 2) + '\n')
  const summary = markdown(results)
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary)
  process.stdout.write(summary)
  if (results.some((result) => ['missing', 'invalid'].includes(result.state))) process.exitCode = 1
}
