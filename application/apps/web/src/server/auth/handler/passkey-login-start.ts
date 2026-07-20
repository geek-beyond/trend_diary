import { authClientConfig, PasskeyClient } from '@trend-diary/authentication'
import { createAuthHandler } from '../auth-handler-factory'

export default createAuthHandler({
  createClient: (c) => new PasskeyClient(authClientConfig(c)),
  authenticate: (client) => client.startAuthentication(),
  respond: (c, started) =>
    c.json({ challengeId: started.challenge_id, options: started.options }, 200),
})
