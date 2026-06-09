import { cleanup } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

vi.mock('sonner', () => {
  return {
    toast: {
      success: vi.fn(),
      error: vi.fn(),
    },
  }
})

vi.mock('swr/mutation', () => {
  return {
    default: () => ({
      trigger: vi.fn(),
      isMutating: false,
    }),
  }
})

vi.mock('@/infrastructure/api', () => {
  return {
    default: vi.fn((url: string) => ({ apiUrl: url })),
  }
})

afterEach(() => {
  cleanup()
})
