const GITHUB_LOGIN_FAILED_MESSAGE = 'GitHubでのログインに失敗しました。もう一度お試しください。'
const GITHUB_LINK_FAILED_MESSAGE = 'GitHub連携に失敗しました。もう一度お試しください。'
const GITHUB_UNLINK_FAILED_MESSAGE = 'GitHub連携の解除に失敗しました。'
const GITHUB_UNLINKED_MESSAGE = 'GitHub連携を解除しました'
// 唯一のログイン手段を外すとアカウントへ入れなくなるため、サーバーが400で拒否する
const GITHUB_UNLINK_BLOCKED_MESSAGE = 'GitHubが唯一のログイン方法のため、連携を解除できません。'

export const GITHUB_AUTH_MESSAGES = {
  loginFailed: GITHUB_LOGIN_FAILED_MESSAGE,
  linkFailed: GITHUB_LINK_FAILED_MESSAGE,
  unlinkFailed: GITHUB_UNLINK_FAILED_MESSAGE,
  unlinked: GITHUB_UNLINKED_MESSAGE,
  unlinkBlocked: GITHUB_UNLINK_BLOCKED_MESSAGE,
}

// OAuth認可はCookie設定を伴うトップレベル遷移で始める必要があるため、fetchではなくhrefで叩く
const GITHUB_LOGIN_PATH = '/api/oauth/github/login'
const GITHUB_LINK_PATH = '/api/oauth/github/link'

// ログイン成功後に戻したい内部パスをクエリで引き継ぐ（検証はサーバー側で行う）
export function buildGithubLoginUrl(redirectTo?: string): string {
  if (!redirectTo) return GITHUB_LOGIN_PATH
  return `${GITHUB_LOGIN_PATH}?redirect=${encodeURIComponent(redirectTo)}`
}

// window.locationの直参照はテストで差し替えられない(jsdomで再定義不可)ため、薄い関数に隔離する
export function navigateToGithubLink(): void {
  window.location.assign(GITHUB_LINK_PATH)
}
