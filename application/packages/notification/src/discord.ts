export type DiscordEmbedField = {
  name: string
  value: string
  inline: boolean
}

export type DiscordEmbed = {
  title: string
  color: number
  fields: DiscordEmbedField[]
  timestamp: string
}

export type DiscordWebhookPayload = {
  content: string | null
  embeds?: DiscordEmbed[]
}

/**
 * Discord Webhook への汎用送信クライアント。
 * web / cron など複数の実行環境から共有する通知基盤。特定のレイヤーには依存しない。
 */
export class DiscordWebhookClient {
  private readonly webhookUrl: string

  constructor(webhookUrl?: string) {
    this.webhookUrl = webhookUrl ?? ''
  }

  async send(payload: DiscordWebhookPayload): Promise<void> {
    if (this.webhookUrl === '') return

    try {
      await fetch(this.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })
    } catch (notificationError) {
      // 通知の失敗は呼び出し元の処理に影響させない
      // biome-ignore lint/suspicious/noConsole: 通知失敗はログに出力する
      console.error('Failed to send notification to Discord', notificationError)
    }
  }

  async sendMessage(content: string): Promise<void> {
    await this.send({ content })
  }
}

/**
 * エラー通知に必要なリクエスト情報。
 * web 側の ChatNotifier ポートと構造的に互換な形を保つ（web には依存しない）。
 */
export type ErrorRequestInfo = {
  url: string
  method: string
  userAgent: string
}

/**
 * 5xx エラーを Discord の embed 形式で通知する。
 * web の ChatNotifier ポート（error(error, requestInfo)）を構造的型で満たすため、
 * `implements` を書かず web へ依存しない。送信は DiscordWebhookClient へ委譲する。
 */
export class DiscordNotifier {
  private readonly client: DiscordWebhookClient

  private readonly maxFieldLength = 1018 // Discord field limit (1024) minus code block chars (6)

  constructor(webhookUrl?: string) {
    this.client = new DiscordWebhookClient(webhookUrl)
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
