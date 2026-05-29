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
    const spinner = canvasElement.querySelector('.animate-spin')
    await expect(spinner).toBeInTheDocument()
    await expect(spinner).toHaveClass('rounded-full', 'border-t-primary')
  },
}
