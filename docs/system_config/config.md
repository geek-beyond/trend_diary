## システム構成図

```mermaid
flowchart TB
    subgraph external["外部サービス"]
        qiita["Qiita（RSS）"]
        zenn["Zenn（RSS）"]
        hatena["はてなブックマーク（RSS）"]
        supabase["Supabase（Auth）"]
        discord["Discord Webhook"]
    end

    subgraph cloudflare["Cloudflare"]
        subgraph private["private"]
            cron["Cron<br/>Workers Scheduled"]
        end
        subgraph public["public"]
            web["Web<br/>Hono + React Router"]
        end
        d1[("D1<br/>SQLite + Drizzle ORM")]
    end

    user["利用者"]
    dev["開発者"]
    gha["GitHub Actions"]

    qiita -->|RSS取得| cron
    zenn -->|RSS取得| cron
    hatena -->|RSS取得| cron
    cron -->|記事保存| d1
    cron -->|通知| discord

    user -->|閲覧| web
    web -->|記事取得| d1
    web -->|認証| supabase

    dev -->|push| gha
    gha -->|デプロイ| web
    gha -->|デプロイ| cron
```

## システム構成

- **Web**: Hono + React Router（Cloudflare Workers）
- **Cron**: RSS取得（Cloudflare Workers Scheduled）。Qiita / Zenn / はてなブックマークのフィードを取得する
- **Database**: Cloudflare D1（SQLite互換）+ Drizzle ORM
- **Auth**: Supabase
- **Notification**: Discord Webhook
