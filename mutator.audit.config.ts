export default {
  exclude: ['**/*.stories.*', '**/test*/**'],
  typecheck: false,
  fullDryRun: true,
  killMatrix: true,
  concurrency: 2,
  reporters: ['text', 'json', 'html'],
}
