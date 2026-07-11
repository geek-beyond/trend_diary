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

const GITHUB_LOGIN_PATH = '/api/oauth/github/login'
const GITHUB_LINK_PATH = '/api/oauth/github/link'

// redirectはログイン成功後の戻り先で、オープンリダイレクト検証はサーバー側が担う
export function buildGithubLoginUrl(redirectTo?: string): string {
  if (!redirectTo) return GITHUB_LOGIN_PATH
  return `${GITHUB_LOGIN_PATH}?redirect=${encodeURIComponent(redirectTo)}`
}

// 連携開始はCookieを伴うOAuthのトップレベル遷移が必要なため、fetchではなくフルページ遷移で叩く。
// window.locationの直参照はjsdomで再定義できずテストで差し替えられないため、薄い関数に隔離する
export function navigateToGithubLink(): void {
  window.location.assign(GITHUB_LINK_PATH)
}
