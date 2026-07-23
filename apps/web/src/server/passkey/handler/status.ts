import { createPasskeyActionHandler } from '../passkey-action'

export default createPasskeyActionHandler({
  execute: (passkeyClient) => passkeyClient.list(),
  respond: (c, passkeys) => c.json({ hasPasskey: passkeys.length > 0 }, 200),
})
