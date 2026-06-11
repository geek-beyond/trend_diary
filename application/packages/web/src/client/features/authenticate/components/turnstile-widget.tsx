import { useEffect, useRef } from 'react'

// 公式の明示レンダリング手順に従い、onloadコールバック指定でAPIを読み込む
// https://developers.cloudflare.com/turnstile/get-started/client-side-rendering/#explicitly-render-the-turnstile-widget
const TURNSTILE_SCRIPT_ID = 'cf-turnstile-script'
const TURNSTILE_ONLOAD_CALLBACK = 'onloadTurnstileCallback'
const TURNSTILE_SCRIPT_SRC = `https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=${TURNSTILE_ONLOAD_CALLBACK}`

interface TurnstileApi {
  render: (container: HTMLElement, options: { sitekey: string }) => string
  remove: (widgetId: string) => void
}

declare global {
  interface Window {
    turnstile?: TurnstileApi
    [TURNSTILE_ONLOAD_CALLBACK]?: () => void
  }
}

interface Props {
  siteKey: string
}

/**
 * Cloudflare Turnstileのウィジェットを描画する。
 * 検証成功時、ウィジェットはフォーム内に hidden input `cf-turnstile-response`(既定名) を挿入し、
 * フォーム送信でトークンがサーバーへ送られる。
 */
export const TurnstileWidget = ({ siteKey }: Props) => {
  const containerRef = useRef<HTMLDivElement>(null)

  // クライアントナビゲーション後も確実に描画するため、明示レンダリングAPIで都度renderする
  useEffect(() => {
    let widgetId: string | undefined

    const renderWidget = () => {
      const container = containerRef.current
      if (!container || !window.turnstile) return
      widgetId = window.turnstile.render(container, { sitekey: siteKey })
    }

    if (window.turnstile) {
      // API読み込み済みなら即描画する
      renderWidget()
    } else {
      // 未読み込みなら公式のonloadコールバック経由で読み込み完了後に描画する
      window[TURNSTILE_ONLOAD_CALLBACK] = renderWidget
      if (!document.getElementById(TURNSTILE_SCRIPT_ID)) {
        const script = document.createElement('script')
        script.id = TURNSTILE_SCRIPT_ID
        script.src = TURNSTILE_SCRIPT_SRC
        script.async = true
        script.defer = true
        document.head.appendChild(script)
      }
    }

    return () => {
      if (widgetId && window.turnstile) window.turnstile.remove(widgetId)
    }
  }, [siteKey])

  return <div ref={containerRef} />
}
