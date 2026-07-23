import type { LoggerType } from '@trend-diary/logger'
import { DEFAULT_FETCH_TIMEOUT_MS, fetchWithTimeout } from '@trend-diary/runtime/http'

export interface DiscordEmbedField {
  name: string
  value: string
  inline: boolean
}

export interface DiscordEmbed {
  title: string
  color: number
  fields: DiscordEmbedField[]
  timestamp: string
}

export interface DiscordWebhookPayload {
  content: string | null
  embeds?: DiscordEmbed[]
}

export interface DiscordWebhookClientOptions {
  maxRetries?: number
  baseDelayMs?: number
  timeoutMs?: number
}

const DEFAULT_MAX_RETRIES = 3
const DEFAULT_BASE_DELAY_MS = 200

/**
 * Discord Webhook への汎用送信クライアント。
 */
export class DiscordWebhookClient {
  private readonly webhookUrl: string

  private readonly logger: LoggerType

  private readonly maxRetries: number

  private readonly baseDelayMs: number

  private readonly timeoutMs: number

  constructor(webhookUrl: string, logger: LoggerType, options: DiscordWebhookClientOptions = {}) {
    this.webhookUrl = webhookUrl
    this.logger = logger
    this.maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES
    this.baseDelayMs = options.baseDelayMs ?? DEFAULT_BASE_DELAY_MS
    this.timeoutMs = options.timeoutMs ?? DEFAULT_FETCH_TIMEOUT_MS
  }

  async send(payload: DiscordWebhookPayload): Promise<void> {
    // 型上は必須の string だが、Workers 実行時は secret 未設定で undefined になり得るため
    // falsy で判定する（=== '' だと undefined がすり抜け、送信失敗のリトライが空回りする）。
    // 未設定のまま稼働すると障害通知が無音で失われ、本来気づくべき障害を見逃すため警告する
    if (!this.webhookUrl) {
      this.logger.warn('Discord webhook URL is not configured; skipping notification')
      return
    }

    let lastError: Error = new Error('Discord notification failed')
    let attempts = 0
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      attempts = attempt
      try {
        // 応答が遅い相手で処理がハングするのを防ぐ（Workers の実行時間制限対策）
        const response = await fetchWithTimeout(this.webhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
          timeoutMs: this.timeoutMs,
        })

        if (response.ok) return

        lastError = new Error(`Discord responded with status ${response.status}`)

        // 401/404 等の恒久的な失敗はリトライしても回復しないため即座に打ち切る
        const isRetryable = response.status === 429 || response.status >= 500
        if (!isRetryable) break
      } catch (notificationError) {
        lastError =
          notificationError instanceof Error
            ? notificationError
            : new Error(String(notificationError))
      }

      if (attempt < this.maxRetries) {
        await this.delay(this.baseDelayMs * 2 ** (attempt - 1))
      }
    }

    // 通知の失敗は呼び出し元の処理に影響させない
    this.logger.error({ msg: 'Failed to send notification to Discord', attempts }, lastError)
  }

  async sendMessage(content: string): Promise<void> {
    await this.send({ content })
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}

/** エラー通知に必要なリクエスト情報。 */
export interface ErrorRequestInfo {
  url: string
  method: string
  userAgent: string
}

/** 5xx エラーを Discord の embed 形式で通知する。 */
export class DiscordNotifier {
  private readonly client: DiscordWebhookClient

  private readonly maxFieldLength = 1018 // Discord field limit (1024) minus code block chars (6)

  constructor(webhookUrl: string, logger: LoggerType, options: DiscordWebhookClientOptions = {}) {
    this.client = new DiscordWebhookClient(webhookUrl, logger, options)
  }

  async error(error: Error, requestInfo: ErrorRequestInfo): Promise<void> {
    await this.client.send(this.createErrorPayload(error, requestInfo))
  }

  private createErrorPayload(error: Error, requestInfo: ErrorRequestInfo): DiscordWebhookPayload {
    const stackTrace = this.truncateField(error.stack || 'No stack trace available')

    return {
      content: null,
      embeds: [
        {
          title: '🚨 5xx Server Error Occurred',
          color: 15158332, // Red color (#E74C3C)
          fields: [
            {
              name: 'Error Message',
              value: `\`\`\`\n${error.message}\n\`\`\``,
              inline: false,
            },
            {
              name: 'Request Info',
              value: `\`\`\`\nMethod: ${requestInfo.method}\nURL: ${requestInfo.url}\nUser-Agent: ${requestInfo.userAgent}\n\`\`\``,
              inline: false,
            },
            {
              name: 'Stack Trace',
              value: `\`\`\`\n${stackTrace}\n\`\`\``,
              inline: false,
            },
          ],
          timestamp: new Date().toISOString(),
        },
      ],
    }
  }

  private truncateField(text: string): string {
    const codeBlockChars = 8 // ```\n + \n```
    const truncatedSuffix = '...(truncated)'
    const maxContentLength = this.maxFieldLength - codeBlockChars - truncatedSuffix.length

    if (text.length <= maxContentLength) {
      return text
    }

    return text.substring(0, maxContentLength) + truncatedSuffix
  }
}
