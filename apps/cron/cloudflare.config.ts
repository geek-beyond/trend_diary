import { bindings, defineConfig, triggers } from 'cf/config'

// D1 migrations use Wrangler because cf config has no migrations_dir.

export default defineConfig({
  worker: {
    name: 'trend-diary-cron',
    compatibilityDate: '2025-04-01',
    compatibilityFlags: ['nodejs_compat'],
    entrypoint: './src/worker.ts',
    workersDev: false,
    observability: {
      enabled: true,
      headSamplingRate: 1,
    },
    triggers: [
      triggers.scheduled({
        schedule: '0 */1 * * *',
      }),
    ],
    env: {
      LOG_LEVEL: bindings.text('info'),
      DISCORD_WEBHOOK_URL: bindings.secret(),
      DB: bindings.d1({
        name: 'trend-diary-db',
        id: '15dfd380-5a78-4237-8e59-49640c2e954f',
      }),
    },
  },
})
