import type { ExternalPath } from '@/client/components/ui/navigation/link'

// 戻り値の型注釈で url を ExternalPath に絞り込み、アサーションなしで安全に返すための型ガード
function isExternalPath(url: string): url is ExternalPath {
  return url.startsWith('http://') || url.startsWith('https://')
}

export function toSafeExternalPath(url: string): ExternalPath | null {
  try {
    const parsed = new URL(url)
    if ((parsed.protocol === 'http:' || parsed.protocol === 'https:') && isExternalPath(url)) {
      return url
    }
  } catch {
    // Invalid URL format is treated as unsafe input.
  }

  return null
}
