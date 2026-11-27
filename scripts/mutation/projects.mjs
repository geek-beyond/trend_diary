const packages = [
  'std',
  'authentication',
  'datastore',
  'domain',
  'logger',
  'notification',
  'runtime',
]
export const projects = {
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
