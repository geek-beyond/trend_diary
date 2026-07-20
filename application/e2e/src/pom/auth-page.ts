import { expect, type Locator, type Page } from '@playwright/test'
import { AUTH_FLOW_TIMEOUT, SUBMIT_OUTCOME_TIMEOUT } from './constants'

type SignupOutcome = 'redirected-to-login' | 'stayed'

const LOGIN_URL_PATTERN = /\/sessions(?:\?.*)?$/

export class AuthPage {
  private readonly emailInput: Locator
  private readonly passwordInput: Locator
  private readonly signupButton: Locator
  private readonly loginButton: Locator
  private readonly githubLoginLink: Locator
  private readonly loginPageText: Locator
  private readonly signupConflictErrorText: Locator
  private readonly trendsPageText: Locator
  private readonly readStatusFilter: Locator

  constructor(private readonly page: Page) {
    this.emailInput = page.getByLabel('メールアドレス')
    this.passwordInput = page.getByLabel('パスワード')
    this.signupButton = page.getByRole('button', { name: 'アカウント作成' })
    // 「パスキーでログイン」と部分一致しないよう完全一致で絞る
    this.loginButton = page.getByRole('button', { name: 'ログイン', exact: true })
    // OAuth開始はページ遷移のためbuttonではなくlinkとして描画される
    this.githubLoginLink = page.getByRole('link', { name: 'GitHubでログイン' })
    this.loginPageText = page.getByText('アカウントをお持ちでないですか？')
    this.signupConflictErrorText = page.getByText('このメールアドレスは既に使用されています')
    this.trendsPageText = page.getByText('絞り込み')
    this.readStatusFilter = page.getByRole('button', { name: '未読のみ' })
  }

  async gotoSignup(): Promise<void> {
    await this.page.goto('/registrations')
  }

  async gotoLogin(): Promise<void> {
    await this.page.goto('/sessions')
  }

  async submitSignup(email: string, password: string): Promise<SignupOutcome> {
    // ハイドレーション未完了だと送信ハンドラ未接続でクリックが握り潰されるため、
    // 合成マーカーは使わず本番の送信結果（/sessions への遷移 or 重複エラー表示）が出るまで fill+click を再試行する
    await expect(async () => {
      // 前回のクリックが遅れて成立した場合に二重送信しない
      if (await this.currentSignupOutcome()) {
        return
      }
      await this.fillCredentials(email, password)
      await this.signupButton.click()
      await expect
        .poll(() => this.currentSignupOutcome(), { timeout: SUBMIT_OUTCOME_TIMEOUT })
        .toBeDefined()
    }).toPass({ timeout: AUTH_FLOW_TIMEOUT })

    const outcome = await this.currentSignupOutcome()
    if (!outcome) {
      throw new Error('サインアップの送信結果を判定できませんでした')
    }
    return outcome
  }

  async waitForLoginPage(): Promise<void> {
    await expect(this.page).toHaveURL(LOGIN_URL_PATTERN, { timeout: AUTH_FLOW_TIMEOUT })
    await expect(this.loginPageText).toBeVisible({ timeout: 5000 })
  }

  // GitHub本体の認可画面は外部サービスのためE2Eでは通せず、導線の表示までを確認する
  async expectGithubLoginVisible(): Promise<void> {
    await expect(this.githubLoginLink).toBeVisible({ timeout: 5000 })
  }

  async submitLogin(email: string, password: string): Promise<void> {
    // submitSignup と同様、本番の送信結果（/sessions からの離脱＝/trends への遷移）が出るまで再試行する
    await expect(async () => {
      // 前回のクリックが遅れて成立した場合に二重送信しない
      if (!LOGIN_URL_PATTERN.test(this.page.url())) {
        return
      }
      await this.fillCredentials(email, password)
      await this.loginButton.click()
      await expect(this.page).not.toHaveURL(LOGIN_URL_PATTERN, { timeout: SUBMIT_OUTCOME_TIMEOUT })
    }).toPass({ timeout: AUTH_FLOW_TIMEOUT })
  }

  async expectSignupConflictError(): Promise<void> {
    await expect(this.signupConflictErrorText).toBeVisible({ timeout: AUTH_FLOW_TIMEOUT })
  }

  async waitForTrendsPage(): Promise<void> {
    await expect(this.page).toHaveURL(/\/trends(?:\?.*)?$/, { timeout: AUTH_FLOW_TIMEOUT })
    await expect(this.trendsPageText).toBeVisible({ timeout: 5000 })
    await expect(this.readStatusFilter).toBeVisible({ timeout: 5000 })
  }

  private async fillCredentials(email: string, password: string): Promise<void> {
    await expect(this.emailInput).toBeEditable()
    await expect(this.passwordInput).toBeEditable()

    await this.emailInput.fill(email)
    await this.passwordInput.fill(password)

    // 非制御フォームのため、ハイドレーション途中の入力は破棄され得る。値が確定しなければ throw し、
    // 呼び出し側の toPass で fill+click ごと再試行させる
    await expect(this.emailInput).toHaveValue(email, { timeout: SUBMIT_OUTCOME_TIMEOUT })
    await expect(this.passwordInput).toHaveValue(password, { timeout: SUBMIT_OUTCOME_TIMEOUT })
  }

  private async currentSignupOutcome(): Promise<SignupOutcome | undefined> {
    if (LOGIN_URL_PATTERN.test(this.page.url())) {
      return 'redirected-to-login'
    }
    if (await this.signupConflictErrorText.isVisible()) {
      return 'stayed'
    }
    return undefined
  }
}
