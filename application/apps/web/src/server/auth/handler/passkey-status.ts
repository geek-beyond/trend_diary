import { authClientConfig, PasskeyClient } from '@trend-diary/authentication'
import { createClientHandler } from '../factory/client-handler'

export default createClientHandler({
  createClient: (c) => new PasskeyClient(authClientConfig(c)),
  authenticate: (client) => client.list(),
  respond: (c, passkeys) => c.json({ hasPasskey: passkeys.length > 0 }, 200),
})
