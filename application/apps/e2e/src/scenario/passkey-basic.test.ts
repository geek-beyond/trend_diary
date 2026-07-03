import { test } from '../fixtures'

// パスキー(WebAuthn)登録→ログインのハッピーパス。E2Eは実際のsupabase CLIに対して実行する。
// NOTE: supabase CLIはpasskey対応済み(https://supabase.com/docs/guides/local-development/cli/config の auth.passkey)。
// 本E2Eシナリオが未実装のためfixme。実装時は config.toml の [auth.passkey]/[auth.webauthn] を有効化＋PASSKEY_ENABLED=true とし、
// PlaywrightのCDP仮想オーセンティケータ(`WebAuthn.addVirtualAuthenticator`)で ceremony を通す。
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
