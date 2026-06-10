import type { LoggerType } from '@trend-diary/common/logger'

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

/** Discord Webhook クライアントの設定。 */
export interface DiscordWebhookClientOptions {
  /** 通知失敗を構造化ログに記録するための Logger。 */
  logger?: LoggerType
  /** 送信を試行する最大回数。 */
  maxRetries?: number
  /** exponential backoff の基準遅延（ミリ秒）。 */
  baseDelayMs?: number
}

const DEFAULT_MAX_RETRIES = 3
const DEFAULT_BASE_DELAY_MS = 200

/**
 * Discord Webhook への汎用送信クライアント。
 */
export class DiscordWebhookClient {
  private readonly webhookUrl: string

  private readonly logger?: LoggerType

  private readonly maxRetries: number

  private readonly baseDelayMs: number

  constructor(webhookUrl?: string, options: DiscordWebhookClientOptions = {}) {
    this.webhookUrl = webhookUrl ?? ''
    this.logger = options.logger
    this.maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES
    this.baseDelayMs = options.baseDelayMs ?? DEFAULT_BASE_DELAY_MS
  }

  async send(payload: DiscordWebhookPayload): Promise<void> {
    if (this.webhookUrl === '') {
      // 未設定のまま稼働すると障害通知が無音で失われ、本来気づくべき障害を見逃すため警告する
      this.logger?.warn('Discord webhook URL is not configured; skipping notification')
      return
    }

    let lastError: Error = new Error('Discord notification failed')
    let attempts = 0
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      attempts = attempt
      try {
        const response = await fetch(this.webhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        })

        if (response.ok) return

        lastError = new Error(`Discord responded with status ${response.status}`)

        // 401/404 等の恒久的な失敗はリトライしても回復しないため即座に打ち切る（429・5xx は一時的とみなす）
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

    // 通知の失敗は呼び出し元の処理に影響させず、構造化ログへの記録のみ行う
    this.logger?.error({ msg: 'Failed to send notification to Discord', attempts }, lastError)
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

  constructor(webhookUrl?: string, options: DiscordWebhookClientOptions = {}) {
    this.client = new DiscordWebhookClient(webhookUrl, options)
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
