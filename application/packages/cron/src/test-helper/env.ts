import { env } from 'cloudflare:test'

const TEST_ENV = {
  DB: env.DB,
  DISCORD_WEBHOOK_URL: 'https://discord.test/webhook',
  LOG_LEVEL: 'silent' as const,
}

export default TEST_ENV
