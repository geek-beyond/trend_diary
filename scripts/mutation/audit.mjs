import { spawnSync } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import { resolve } from 'node:path'

const packages = [
  'std',
  'authentication',
  'datastore',
  'domain',
  'logger',
  'notification',
  'runtime',
]
const project = process.argv[2]
const projects = {
  ...Object.fromEntries(packages.map((name) => [name, { root: `packages/${name}` }])),
  'web-client': {
    root: 'apps/web',
    config: 'apps/web/vitest.mutation.config.ts',
    include: ['src/client/**/*.{ts,tsx}'],
  },
  'web-server': {
    root: 'apps/web',
    config: 'apps/web/vitest.mutation.server.config.ts',
    include: [
      'src/server.ts',
      'src/server/**/*.ts',
      'src/middleware/**/*.ts',
      'src/common/**/*.ts',
      'src/infrastructure/**/*.ts',
    ],
  },
  cron: { root: 'apps/cron' },
}
if (!Object.hasOwn(projects, project)) {
  console.error(`対象を指定してください: ${Object.keys(projects).join(', ')}`)
  process.exit(1)
}
const { root, config, include = ['src/**/*.{ts,tsx}'] } = projects[project]
const reportDir = resolve('mutation-audit', project)
mkdirSync(reportDir, { recursive: true })
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
  project === 'web-server' ? '1' : '2',
  '--exclude',
  '**/*.stories.*',
  '--exclude',
  'src/test*/**',
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
const result = spawnSync('pnpm', args, { stdio: 'inherit' })
if (result.error) console.error(result.error)
process.exit(result.status ?? 1)
