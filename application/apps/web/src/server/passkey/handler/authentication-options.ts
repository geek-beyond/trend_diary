import { createPasskeyActionHandler, respondChallengeOptions } from '../passkey-action'

export default createPasskeyActionHandler({
  execute: (passkeyClient) => passkeyClient.startAuthentication(),
  respond: (c, started) => respondChallengeOptions(c, started),
})
