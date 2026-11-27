import audit from '../../mutator.audit.config'

export default {
  ...audit,
  concurrency: 1,
  vitestConfig: 'vitest.mutation.server.config.ts',
  include: [
    'src/server.ts',
    'src/server/**/*.ts',
    'src/middleware/**/*.ts',
    'src/common/**/*.ts',
    'src/infrastructure/**/*.ts',
  ],
}
