import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn } from 'storybook/test'
import { ALL_MEDIA } from '@/client/features/article'
import InboxPage from './page'

const longUrl = `https://example.com/${'a'.repeat(240)}`

const meta: Meta<typeof InboxPage> = {
  component: InboxPage,
  parameters: { layout: 'fullscreen' },
  decorators: [
    (Story) => (
      <div className='w-full max-w-80' data-testid='inbox-viewport'>
        <Story />
      </div>
    ),
  ],
}
export default meta

export const HatenaRss: StoryObj<typeof InboxPage> = {
  args: {
    article: {
      articleId: '1',
      media: 'hatena',
      title: '長いタイトル'.repeat(10) + 'X'.repeat(240),
      author: 'はてなブックマーク',
      description: `<blockquote><p>記事の概要 &amp; 詳細</p><a href="${longUrl}">${longUrl}</a><img src="/rss-image.png"><script>非表示</script></blockquote>`,
      url: longUrl,
      createdAt: new Date('2024-01-01T00:00:00Z'),
    },
    isLoading: false,
    hasError: false,
    isJustCompleted: false,
    remainingCount: 1,
    selectedMedia: ALL_MEDIA,
    onMediaChange: fn(),
    onSkip: fn(),
    onRead: fn(),
    onLater: fn(),
  },
  play: async ({ canvas }) => {
    const viewport = await canvas.findByTestId('inbox-viewport')
    const page = canvas.getByRole('main')
    const heading = canvas.getByRole('heading', { level: 2 })
    const card = heading.parentElement!
    const description = card.querySelector('p')!

    const widths = [
      viewport,
      page,
      page.firstElementChild!,
      page.querySelector('fieldset')!,
      card,
      heading,
      heading.lastElementChild!,
      description,
    ].map((element) => ({
      element: element.tagName,
      clientWidth: element.clientWidth,
      scrollWidth: element.scrollWidth,
      minWidth: getComputedStyle(element).minWidth,
      overflowWrap: getComputedStyle(element).overflowWrap,
    }))
    await expect(
      widths.filter(({ scrollWidth, clientWidth }) => scrollWidth > clientWidth),
    ).toEqual([])
    await expect(description.childElementCount).toBe(0)
    await expect(description.textContent).toBe(`記事の概要 & 詳細\n${longUrl}`)
  },
}
