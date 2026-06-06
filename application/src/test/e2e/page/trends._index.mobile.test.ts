import { expect, test } from '@/test/e2e/fixtures'
import * as articleHelper from '@/test/e2e/helper/article'
import { ArticleDrawer } from '@/test/e2e/pom/components/article-drawer'
import { MobileFilterPanel } from '@/test/e2e/pom/components/mobile-filter-panel'
import { SUPPORTED_ARTICLE_URL_PATTERN, TIMEOUT } from '@/test/e2e/pom/constants'
import { TrendsPage } from '@/test/e2e/pom/trends-page'

const ARTICLE_COUNT = 10
const MOBILE_VIEWPORT = { width: 375, height: 667 }
const LONG_ARTICLE_TITLE = '概要トグル確認用記事'
const LONG_ARTICLE_DESCRIPTION =
  'TrendDiaryは技術トレンドの収集と閲覧を効率化するためのサービスであり、記事の要点を短時間で把握しながら必要に応じて元記事へ素早くアクセスできる。モバイル表示時の概要折りたたみ挙動を確認するため、この説明文は十分に長くしている。'

test.describe('記事一覧ページ(モバイル)', () => {
  test.use({ viewport: MOBILE_VIEWPORT })

  test.beforeEach(async ({ page }) => {
    const trendsPage = new TrendsPage(page)
    await trendsPage.goto()
  })

  test.describe('レイアウト確認', () => {
    test('AppHeaderが表示され、AppSidebarが非表示であること', async ({ page }) => {
      // AppHeaderが表示されていること
      const header = page.getByRole('banner')
      await expect(header).toBeVisible()

      // ハンバーガーメニューボタンが表示されていること
      const menuButton = page.getByRole('button', { name: 'メニューを開く' })
      await expect(menuButton).toBeVisible()

      // AppSidebar側のラベルは初期状態で非表示
      await expect(page.getByText('Application')).not.toBeVisible()
    })

    test('ハンバーガーメニューを開いてメニュー項目が表示されること', async ({ page }) => {
      const menuButton = page.getByRole('button', { name: 'メニューを開く' })
      const sheet = page.getByRole('dialog', { name: 'メニュー' })

      // INFO: ハイドレーション完了前のクリックはハンドラ未アタッチで失われるため、
      // Sheetが開くまでクリックを再試行する
      await expect(async () => {
        if (!(await sheet.isVisible())) {
          await menuButton.click()
        }
        await expect(sheet).toBeVisible({ timeout: 1_000 })
      }).toPass({ timeout: TIMEOUT })

      // Applicationラベルが表示されていること
      await expect(sheet.getByText('Application')).toBeVisible()

      // トレンド記事リンクが表示されていること
      await expect(sheet.getByRole('link', { name: 'トレンド記事' })).toBeVisible()
    })
  })

  test.describe('記事がない場合', () => {
    test('記事がないと表示される', async ({ page }) => {
      const trendsPage = new TrendsPage(page)
      await trendsPage.expectNoArticlesMessage()
    })
  })

  test.describe('記事がある場合', () => {
    const createdArticleIds: bigint[] = []

    test.beforeAll(async ({ rdb }) => {
      // 記事を作成
      const articles = await Promise.all(
        Array.from({ length: ARTICLE_COUNT }, () => articleHelper.createArticle(rdb)),
      )
      createdArticleIds.push(...articles.map((a) => a.articleId))
    })

    test.afterAll(async ({ rdb }) => {
      // テスト後に記事をクリーンアップ
      await articleHelper.cleanUp(rdb, createdArticleIds)
    })

    test.beforeEach(async ({ page }) => {
      const trendsPage = new TrendsPage(page)
      await trendsPage.waitForArticleCards()
    })

    test('記事カードがモバイルサイズで全幅表示されること', async ({ page }) => {
      const trendsPage = new TrendsPage(page)
      const articleCard = trendsPage.firstArticleCard()
      await expect(articleCard).toBeVisible()

      // カードの幅を取得(w-fullで375pxに近い値になるはず)
      const cardBox = await articleCard.boundingBox()
      expect(cardBox).not.toBeNull()
      if (cardBox) {
        // モバイル幅375pxから左右のpadding等を引いた値に近いことを確認
        // 完全一致ではなく、おおよそ全幅であることを確認
        expect(cardBox.width).toBeGreaterThan(300)
      }
    })

    test('記事一覧から記事詳細を閲覧し、再び記事一覧に戻る', async ({ page }) => {
      const trendsPage = new TrendsPage(page)
      const articleCard = trendsPage.firstArticleCard()
      await expect(articleCard).toBeVisible()

      await trendsPage.openFirstArticle()

      const drawer = new ArticleDrawer(page)
      await drawer.waitOpen()
      await drawer.close()
      await drawer.expectClosed()

      // 記事一覧に戻っていることを確認(記事カードが表示されていること)
      await expect(articleCard).toBeVisible()
    })

    test('記事一覧から記事詳細を閲覧し、その実際の記事を閲覧する', async ({ page }) => {
      const drawer = new ArticleDrawer(page)
      await drawer.mockWindowOpen()

      const trendsPage = new TrendsPage(page)
      await trendsPage.openFirstArticle()
      await drawer.waitOpen()
      await drawer.clickReadArticle()
      const openedUrl = await drawer.getLastOpenedUrl()

      // 記事URLが開かれることを確認
      expect(openedUrl).toMatch(SUPPORTED_ARTICLE_URL_PATTERN)
    })
  })

  test.describe('記事詳細の概要表示(モバイル)', () => {
    const createdArticleIds: bigint[] = []

    test.beforeAll(async ({ rdb }) => {
      const article = await articleHelper.createArticle(rdb, {
        title: LONG_ARTICLE_TITLE,
        description: LONG_ARTICLE_DESCRIPTION,
      })
      createdArticleIds.push(article.articleId)
    })

    test.afterAll(async ({ rdb }) => {
      await articleHelper.cleanUp(rdb, createdArticleIds)
    })

    test.beforeEach(async ({ page }) => {
      const trendsPage = new TrendsPage(page)
      await trendsPage.waitForArticleCards()
    })

    test('長い概要は初期折りたたみで表示され、続きを読むで展開できること', async ({ page }) => {
      const trendsPage = new TrendsPage(page)
      await trendsPage.openArticleByTitle(LONG_ARTICLE_TITLE)

      const drawer = new ArticleDrawer(page)
      await drawer.waitOpen()
      await drawer.expectDescriptionCollapsed()
      await drawer.expectDescriptionToggle('続きを読む')

      await drawer.clickDescriptionToggle('続きを読む')
      await drawer.expectDescriptionExpanded()
      await drawer.expectDescriptionToggle('閉じる')
      await drawer.expectReadArticleButtonVisible()
    })
  })

  test.describe('メディアフィルター機能(モバイル)', () => {
    const QIITA_COUNT = 5
    const ZENN_COUNT = 3
    const createdArticleIds: bigint[] = []

    test.beforeAll(async ({ rdb }) => {
      // Qiita記事を作成
      const qiitaArticles = await Promise.all(
        Array.from({ length: QIITA_COUNT }, () =>
          articleHelper.createArticle(rdb, { media: 'qiita' }),
        ),
      )
      createdArticleIds.push(...qiitaArticles.map((a) => a.articleId))

      // Zenn記事を作成
      const zennArticles = await Promise.all(
        Array.from({ length: ZENN_COUNT }, () =>
          articleHelper.createArticle(rdb, { media: 'zenn' }),
        ),
      )
      createdArticleIds.push(...zennArticles.map((a) => a.articleId))
    })

    test.afterAll(async ({ rdb }) => {
      await articleHelper.cleanUp(rdb, createdArticleIds)
    })

    test.beforeEach(async ({ page }) => {
      const trendsPage = new TrendsPage(page)
      await trendsPage.waitForArticleCards()
    })

    test('メディアフィルタートリガーが表示される', async ({ page }) => {
      const mobileFilter = new MobileFilterPanel(page)
      await mobileFilter.expectTriggerLabel('絞り込み')
    })

    test('Qiitaを選択しても適用前は記事一覧に反映されない', async ({ page }) => {
      const mobileFilter = new MobileFilterPanel(page)
      await mobileFilter.openPanel()
      await mobileFilter.select('qiita')

      const trendsPage = new TrendsPage(page)
      await trendsPage.waitForUrl(/\/trends$/)
      await trendsPage.expectArticleCount(QIITA_COUNT + ZENN_COUNT)
    })

    test('7日を選択しても適用前は日付条件が反映されない', async ({ page }) => {
      const mobileFilter = new MobileFilterPanel(page)
      await mobileFilter.openPanel()
      await mobileFilter.selectDatePreset('last7days')

      const trendsPage = new TrendsPage(page)
      await trendsPage.waitForUrl(/\/trends$/)
      trendsPage.expectQueryParamNull('from')
      trendsPage.expectQueryParamNull('to')
      await trendsPage.expectArticleCount(QIITA_COUNT + ZENN_COUNT)
    })

    test('Qiitaフィルターを選択して適用すると、Qiita記事のみが表示される', async ({ page }) => {
      const mobileFilter = new MobileFilterPanel(page)
      await mobileFilter.openPanel()
      await mobileFilter.select('qiita')
      await mobileFilter.apply()

      const trendsPage = new TrendsPage(page)
      await trendsPage.waitForUrl(/\/trends\?media=qiita$/)
      await trendsPage.expectArticleCount(QIITA_COUNT)
      await trendsPage.expectQiitaIconCount(QIITA_COUNT)
    })

    test('Zennフィルターを選択すると、Zenn記事のみが表示される', async ({ page }) => {
      const mobileFilter = new MobileFilterPanel(page)
      await mobileFilter.openPanel()
      await mobileFilter.select('zenn')
      await mobileFilter.apply()

      const trendsPage = new TrendsPage(page)
      await trendsPage.waitForUrl(/\/trends\?media=zenn$/)
      await trendsPage.expectArticleCount(ZENN_COUNT)
      await trendsPage.expectZennIconCount(ZENN_COUNT)
    })

    test('7日を選択して適用するとfrom/to付きURLで反映される', async ({ page }) => {
      const mobileFilter = new MobileFilterPanel(page)
      await mobileFilter.openPanel()
      await mobileFilter.selectDatePreset('last7days')
      await mobileFilter.apply()

      const trendsPage = new TrendsPage(page)
      await trendsPage.waitForUrl(/\/trends\?from=\d{4}-\d{2}-\d{2}&to=\d{4}-\d{2}-\d{2}$/)
      trendsPage.expectQueryParamPresent('from')
      trendsPage.expectQueryParamPresent('to')
      await trendsPage.expectArticleCount(QIITA_COUNT + ZENN_COUNT)
    })

    test('クリアを押すと即時反映で全記事が表示され、パネルが閉じる', async ({ page }) => {
      const mobileFilter = new MobileFilterPanel(page)
      await mobileFilter.openPanel()
      await mobileFilter.select('qiita')
      await mobileFilter.apply()

      const trendsPage = new TrendsPage(page)
      await trendsPage.waitForUrl(/\/trends\?media=qiita$/)
      await trendsPage.expectArticleCount(QIITA_COUNT)

      await mobileFilter.openPanel()
      await mobileFilter.clear()

      await trendsPage.waitForUrl(/\/trends$/)
      await trendsPage.expectArticleCount(QIITA_COUNT + ZENN_COUNT)
      await expect(page.locator("[data-slot='mobile-filter-panel']")).not.toBeVisible()
    })
  })
})
