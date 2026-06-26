import { type ExternalPath, isExternalPath } from '@/client/components/ui/navigation/link'

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
