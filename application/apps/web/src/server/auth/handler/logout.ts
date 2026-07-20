import { authClientConfig, PasswordAuthClient } from '@trend-diary/authentication'
import { createClientHandler } from '../factory/client-handler'

export default createClientHandler({
  createClient: (c) => new PasswordAuthClient(authClientConfig(c)),
  authenticate: (client) => client.signOut(),
  log: (_result, ctx) => ctx.logger.info('logout success'),
  respond: (c) => c.body(null, 204),
})
