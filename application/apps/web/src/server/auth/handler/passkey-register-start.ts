import { authClientConfig, PasskeyClient } from '@trend-diary/authentication'
import { createClientHandler } from '../factory/client-handler'

export default createClientHandler({
  createClient: (c) => new PasskeyClient(authClientConfig(c)),
  authenticate: (client) => client.startRegistration(),
  respond: (c, started) =>
    c.json({ challengeId: started.challenge_id, options: started.options }, 200),
})
