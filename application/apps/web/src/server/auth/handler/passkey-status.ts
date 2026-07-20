import { authClientConfig, PasskeyClient } from '@trend-diary/authentication'
import { createAuthHandler } from '../factory/auth-handler'

export default createAuthHandler({
  createClient: (c) => new PasskeyClient(authClientConfig(c)),
  authenticate: (client) => client.list(),
  respond: (c, passkeys) => c.json({ hasPasskey: passkeys.length > 0 }, 200),
})
