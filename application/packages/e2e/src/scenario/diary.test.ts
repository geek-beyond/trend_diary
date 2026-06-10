import { faker } from '@faker-js/faker'
import { test } from '../fixtures'
import * as userHelper from '../helper/user'
import { AppSidebar } from '../pom/app-sidebar'
import { AuthPage } from '../pom/auth-page'
import { AUTH_SCENARIO_TIMEOUT } from '../pom/constants'
import { DiaryPage } from '../pom/diary-page'

test.describe('ダイアリー画面シナリオ', () => {
  test('未ログインではログインが必要な旨が表示される', async ({ page }) => {
    const diaryPage = new DiaryPage(page)
    await diaryPage.goto()
    await diaryPage.expectLoginRequired()
  })

  test.describe('ログイン後の基本表示', () => {
    const password = 'Aa1@aaaa'
    const suffix = faker.string.alphanumeric(10).toLowerCase()
    const email = faker.internet.email({
      firstName: 'e2e',
      lastName: `diary${suffix}`,
      provider: 'example.com',
      allowSpecialCharacters: false,
    })

    test.afterAll(async ({ rdb }) => {
      await userHelper.cleanUpByEmailPattern(rdb, email)
    })

    test('サイドバーからダイアリーを開き、読了記事一覧と空状態が表示される', async ({ page }) => {
      test.setTimeout(AUTH_SCENARIO_TIMEOUT)

      const authPage = new AuthPage(page)
      await authPage.signupThenLogin(email, password)

      const sidebar = new AppSidebar(page)
      await sidebar.gotoDiary()

      const diaryPage = new DiaryPage(page)
      await diaryPage.expectTitleVisible()
      await diaryPage.expectReadListSection()
      // 新規ユーザーは読了記事を持たないため、空状態が決定的に表示される
      await diaryPage.expectEmptyReadList()
    })
  })
})
