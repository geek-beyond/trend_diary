import { z } from 'zod'

// 端末間で共有する画面テーマ。'system'はOSの配色設定に追従する
export const themeSchema = z.enum(['system', 'light', 'dark'])

export const themeUpdateSchema = z.object({
  theme: themeSchema,
})

export type Theme = z.infer<typeof themeSchema>
export type ThemeUpdate = z.infer<typeof themeUpdateSchema>
