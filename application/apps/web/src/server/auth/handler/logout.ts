import { authClientConfig, PasswordAuthClient } from '@trend-diary/authentication'
import { createAuthHandler } from '../auth-handler-factory'

export default createAuthHandler({
  createClient: (ctx) => new PasswordAuthClient(authClientConfig(ctx.c)),
  authenticate: (client) => client.signOut(),
  log: (_result, ctx) => ctx.logger.info('logout success'),
  respond: (c) => c.body(null, 204),
})
