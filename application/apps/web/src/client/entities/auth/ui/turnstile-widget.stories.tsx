import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, waitFor } from 'storybook/test'
import { TurnstileWidget } from './turnstile-widget'

const renderMock = fn((_container: HTMLElement, _options: { sitekey: string }) => 'widget-id')
const removeMock = fn((_widgetId: string) => {})

const meta: Meta<typeof TurnstileWidget> = {
  component: TurnstileWidget,
  parameters: {
    layout: 'centered',
  },
  args: {
    siteKey: '1x00000000000000000000AA',
  },
}
export default meta

type Story = StoryObj<typeof TurnstileWidget>

// API 読み込み済みの場合、マウント時に即 render される分岐を検証する。
export const ApiAlreadyLoaded: Story = {
  beforeEach: () => {
    renderMock.mockClear()
    removeMock.mockClear()
    window.turnstile = { render: renderMock, remove: removeMock }
    return () => {
      window.turnstile = undefined
    }
  },
  play: async ({ args, step }) => {
    await step('siteKey 付きで turnstile.render が呼ばれることを確認', async () => {
      await waitFor(() => {
        expect(renderMock).toHaveBeenCalledTimes(1)
      })
      await expect(renderMock.mock.calls[0]?.[1]).toEqual({ sitekey: args.siteKey })
    })
  },
}

// API 未読み込みの場合、onload コールバック用のスクリプトが追加される分岐を検証する。
export const ApiNotLoaded: Story = {
  beforeEach: () => {
    window.turnstile = undefined
    return () => {
      document.getElementById('cf-turnstile-script')?.remove()
    }
  },
  play: async ({ step }) => {
    await step('Turnstile スクリプトが head に追加されることを確認', async () => {
      await waitFor(() => {
        expect(document.getElementById('cf-turnstile-script')).toBeInTheDocument()
      })
    })
  },
}
