import { createPasskeyActionHandler, respondChallengeOptions } from '../passkey-action'

export default createPasskeyActionHandler({
  execute: (passkeyClient) => passkeyClient.startRegistration(),
  respond: (c, started) => respondChallengeOptions(c, started),
})
