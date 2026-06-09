// vite.config.ts の injectIsDevPlugin が define で埋め込むグローバル定数。
// dev サーバ起動時のみ true、build（本番）時は false に静的置換される。
declare const __IS_DEV__: boolean
