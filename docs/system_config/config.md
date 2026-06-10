## システム構成図

![構成図](config.jpg)

## システム構成

- **Web**: Hono + React Router（Cloudflare Workers）
- **Cron**: RSS取得（Cloudflare Workers Scheduled）
- **Database**: Cloudflare D1（SQLite互換）+ Drizzle ORM
- **Auth**: Supabase
- **Notification**: Discord Webhook
