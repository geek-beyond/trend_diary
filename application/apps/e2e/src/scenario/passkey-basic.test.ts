import { test } from '../fixtures'

// passkey(WebAuthn)登録→ログインのハッピーパス。
// NOTE: ローカルのsupa-emu(supabase CLI)がpasskeyに未対応のため、現状はfixmeでskipする。
// supa-emuが対応したら、PASSKEY_ENABLED=true・config.tomlの[auth.passkey]/[auth.webauthn]を有効化し、
// Playwrightのcdp仮想オーセンティケータ(CDP `WebAuthn.addVirtualAuthenticator`)を用いて有効化する。
// 手順の骨子:
//   1. メール+パスワードでログイン
//   2. 案内バナー「passkeyを登録」から登録(仮想オーセンティケータで生成)
//   3. ログアウト
//   4. 「passkeyでログイン」から認証し、/trendsへ遷移することを確認
test.describe('passkey登録・ログインシナリオ', () => {
  test.fixme('passkeyを登録し、passkeyでログインできる', async () => {
    // supa-emuのpasskey対応後に実装する
  })
})
