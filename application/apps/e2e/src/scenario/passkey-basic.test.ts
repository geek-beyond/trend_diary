import { test } from '../fixtures'

// パスキー(WebAuthn)登録→ログインのハッピーパス。E2Eは実際のsupabase CLIに対して実行する。
// NOTE: supabase CLIがpasskeyに未対応のため、現状はfixmeでskipする。
// 対応したら、PASSKEY_ENABLED=true・config.tomlの[auth.passkey]/[auth.webauthn]を有効化し、
// PlaywrightのCDP仮想オーセンティケータ(`WebAuthn.addVirtualAuthenticator`)で有効化する。
// 手順の骨子:
//   1. メール+パスワードでログイン
//   2. パスキーを登録(仮想オーセンティケータで生成)
//   3. ログアウト
//   4. 「パスキーでログイン」から認証し、/trendsへ遷移することを確認
test.describe('パスキー登録・ログインシナリオ', () => {
  test.fixme('パスキーを登録し、パスキーでログインできる', async () => {
    // supabase CLIのpasskey対応後に実装する
  })
})
