import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect } from 'storybook/test'
import SpinnerCircle3 from './spinner-09'

const meta: Meta<typeof SpinnerCircle3> = {
  component: SpinnerCircle3,
}
export default meta

type Story = StoryObj<typeof SpinnerCircle3>

export const Default: Story = {
  play: async ({ canvasElement }) => {
    // 視覚的なローディング表現のみのコンポーネントのため、描画されることだけを確認する
    await expect(canvasElement.firstElementChild).toBeInTheDocument()
  },
}
