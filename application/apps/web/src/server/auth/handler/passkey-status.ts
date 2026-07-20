import { authClientConfig, PasskeyClient } from '@trend-diary/authentication'
import { createAuthHandler } from '../auth-handler-factory'

export default createAuthHandler({
  createClient: (ctx) => new PasskeyClient(authClientConfig(ctx.c)),
  authenticate: (client) => client.list(),
  respond: (c, passkeys) => c.json({ hasPasskey: passkeys.length > 0 }, 200),
})
