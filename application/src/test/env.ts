import { env } from 'cloudflare:test'
import { Env } from '@/web/env'

const TEST_ENV = {
  DB: env.DB,
  DISCORD_WEBHOOK_URL: process.env.DISCORD_WEBHOOK_URL ?? '',
  // ローカルSupabase環境変数
  SUPABASE_URL: 'http://127.0.0.1:54321',
  SUPABASE_ANON_KEY:
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0',
  SUPABASE_SERVICE_ROLE_KEY:
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU',
  LOG_LEVEL: 'silent', // テストではログを出力しない
} satisfies Env['Bindings']

export default TEST_ENV
