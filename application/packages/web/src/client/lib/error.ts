/**
 * APIエラーから表示用のメッセージを抽出する
 * @param error - キャッチしたエラーオブジェクト
 * @param defaultMessage - エラーメッセージが取得できない場合のデフォルトメッセージ
 * @returns 表示用のエラーメッセージ
 */
export function getApiErrorMessage(error: unknown, defaultMessage: string): string {
  if (error && typeof error === 'object' && 'message' in error) {
    return (error as { message?: string }).message ?? defaultMessage
  }
  return defaultMessage
}
