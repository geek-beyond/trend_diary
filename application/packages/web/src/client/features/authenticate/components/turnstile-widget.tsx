import { useEffect, useRef } from 'react'

// 明示レンダリング用APIを使うため、scriptは render=explicit で読み込む
const TURNSTILE_SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'

interface TurnstileApi {
  render: (
    container: HTMLElement,
    options: { sitekey: string; 'response-field-name'?: string },
  ) => string
  remove: (widgetId: string) => void
}

declare global {
  interface Window {
    turnstile?: TurnstileApi
  }
}

interface Props {
  siteKey: string
}

/**
 * Cloudflare Turnstileのウィジェットを描画する。
 * 検証成功時、ウィジェットはフォーム内に hidden input `cf-turnstile-response` を挿入し、
 * フォーム送信でトークンがサーバーへ送られる。
 */
export const TurnstileWidget = ({ siteKey }: Props) => {
  const containerRef = useRef<HTMLDivElement>(null)

  // クライアントナビゲーション後も確実に描画するため、明示レンダリングAPIで都度renderする
  useEffect(() => {
    let widgetId: string | undefined
    let scriptElement: HTMLScriptElement | null = null

    const renderWidget = () => {
      const container = containerRef.current
      if (!container || !window.turnstile) return
      widgetId = window.turnstile.render(container, {
        sitekey: siteKey,
        'response-field-name': 'cf-turnstile-response',
      })
    }

    if (window.turnstile) {
      renderWidget()
    } else {
      const existing = document.querySelector<HTMLScriptElement>(
        `script[src="${TURNSTILE_SCRIPT_SRC}"]`,
      )
      if (existing) {
        scriptElement = existing
        existing.addEventListener('load', renderWidget)
      } else {
        const script = document.createElement('script')
        script.src = TURNSTILE_SCRIPT_SRC
        script.async = true
        script.defer = true
        scriptElement = script
        script.addEventListener('load', renderWidget)
        document.head.appendChild(script)
      }
    }

    return () => {
      if (widgetId && window.turnstile) window.turnstile.remove(widgetId)
      // ロード前に再実行/アンマウントされた場合に重複renderを防ぐため、未発火のリスナーを解除する
      if (scriptElement) scriptElement.removeEventListener('load', renderWidget)
    }
  }, [siteKey])

  return <div ref={containerRef} />
}
