import { type ExternalPath, isExternalPath } from '@/client/components/ui/navigation/link'

export function toSafeExternalPath(url: string): ExternalPath | null {
  try {
    // oxlint-disable-next-line no-new -- URL構文の検証にはコンストラクタが投げる例外だけを使うため
    new URL(url)
    if (isExternalPath(url)) {
      return url
    }
  } catch {
    // 不正なRSS URLでも日記画面全体の表示を継続するため。
  }

  return null
}
