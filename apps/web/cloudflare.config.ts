import { bindings, defineConfig } from 'cf/config'

// D1 migrations use Wrangler because cf config has no migrations_dir.

export default defineConfig({
  worker: {
    name: 'trend-diary',
    compatibilityDate: '2025-04-01',
    compatibilityFlags: ['nodejs_compat'],
    entrypoint: './src/worker.ts',
    observability: {
      enabled: true,
      headSamplingRate: 1,
    },
    env: {
      LOG_LEVEL: bindings.text('info'),
      TURNSTILE_SITE_KEY: bindings.text('0x4AAAAAADiD2o4io1Au9fnq'),
      SUPABASE_URL: bindings.secret(),
      SUPABASE_ANON_KEY: bindings.secret(),
      DISCORD_WEBHOOK_URL: bindings.secret(),
      TURNSTILE_SECRET_KEY: bindings.secret(),
      DB: bindings.d1({
        name: 'trend-diary-db',
        id: '15dfd380-5a78-4237-8e59-49640c2e954f',
      }),
      AUTH_RATE_LIMITER: bindings.rateLimit({
        namespace: '1001',
        simple: {
          limit: 10,
          period: 60,
        },
      }),
    },
  },
})
