import { spawnSync } from 'node:child_process'
import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { projects } from './projects.mjs'

const project = process.argv[2]
if (!Object.hasOwn(projects, project)) {
  process.stderr.write(`対象を指定してください: ${Object.keys(projects).join(', ')}\n`)
  process.exit(1)
}
const { root, config, include = ['src/**/*.{ts,tsx}'] } = projects[project]
const reportDir = resolve('mutation-audit', project)
// 失敗時に以前のレポートを今回の結果として集約しないため。
rmSync(reportDir, { recursive: true, force: true })
// 全件の再評価で、限定調査や過去の判定を今回の測定へ混ぜないため。
rmSync(resolve(root, '.mutator/snapshot.json'), { force: true })
mkdirSync(reportDir, { recursive: true })
const revision = spawnSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).stdout?.trim()
const worktreeDirty = Boolean(
  spawnSync('git', ['status', '--porcelain'], { encoding: 'utf8' }).stdout?.trim(),
)
const run = {
  worktreeDirty,
  project,
  revision,
  runId: process.env.GITHUB_RUN_ID,
  startedAt: new Date().toISOString(),
}
writeFileSync(resolve(reportDir, 'run.json'), JSON.stringify(run))
// 差分・過去のcoverageに依存すると、既存テスト全体の重複を比較できないため。
const args = [
  'exec',
  'mutator',
  '--root',
  root,
  '--no-typecheck',
  '--full-dry-run',
  '--kill-matrix',
  '-j',
  ['web-server', 'cron'].includes(project) ? '1' : '2',
  '--exclude',
  '**/*.stories.*',
  '--exclude',
  '**/test*/**',
  '--reporter',
  'text',
  '--reporter',
  'json',
  '--reporter',
  'html',
  '--report-dir',
  reportDir,
  ...include.flatMap((glob) => ['--include', glob]),
  ...(config ? ['--config', resolve(config)] : []),
]
// Vitestのprogrammatic APIはCLIと異なりNODE_ENVを設定しないため。
const result = spawnSync('pnpm', args, {
  stdio: 'inherit',
  env: { ...process.env, NODE_ENV: 'test' },
})
writeFileSync(
  resolve(reportDir, 'run.json'),
  JSON.stringify({
    ...run,
    finishedAt: new Date().toISOString(),
    exitCode: result.status,
    signal: result.signal,
    error: result.error?.message,
  }),
)
if (result.error) process.stderr.write(`${result.error.message}\n`)
process.exit(result.status ?? 1)
