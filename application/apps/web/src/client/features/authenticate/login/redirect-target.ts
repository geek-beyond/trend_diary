// 外部ドメインへの誤誘導（オープンリダイレクト）を避けるため、内部の絶対パス以外は無視する
export function resolveLoginRedirectTarget(rawValue: string | null): string | undefined {
  if (!rawValue) return undefined
  if (!rawValue.startsWith('/') || rawValue.startsWith('//') || rawValue.startsWith('/\\')) {
    return undefined
  }

  return rawValue
}
