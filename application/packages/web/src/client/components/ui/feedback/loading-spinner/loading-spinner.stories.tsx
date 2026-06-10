import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect } from 'storybook/test'
import LoadingSpinner from '.'

const meta: Meta<typeof LoadingSpinner> = {
  component: LoadingSpinner,
  parameters: {
    layout: 'fullscreen',
  },
}
export default meta

type Story = StoryObj<typeof LoadingSpinner>

export const Default: Story = {
  play: async ({ canvas, step }) => {
    await step('LoadingSpinnerコンポーネントが表示されることを確認', async () => {
      const container = canvas.getByRole('status', { name: 'Loading...' })
      await expect(container).toBeInTheDocument()
      await expect(container).toBeVisible()
    })

    await step('スピナーが表示されることを確認', async () => {
      const container = canvas.getByRole('status', { name: 'Loading...' })
      const spinner = container.querySelector('div > div')
      await expect(spinner).toBeInTheDocument()
      await expect(spinner).toBeVisible()
    })

    await step('スピナーが回転アニメーションしていることを確認', async () => {
      const container = canvas.getByRole('status', { name: 'Loading...' })
      const spinner = container.querySelector('div > div')
      await expect(spinner).not.toBeNull()
      if (!spinner) {
        throw new Error('spinner element not found')
      }
      const spinnerStyle = window.getComputedStyle(spinner)
      await expect(spinnerStyle.animation).toContain('spin')
    })
  },
}
