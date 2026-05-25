# SupabaseのfunctionsからDB接続の方法について

Status: Accepted

Relevant PR:

- https://github.com/Geek-Beyond/trend_diary/pull/107

# Context

supabase functionsでもhonoのアプリケーション同様`@prisma/client`を用いたDB接続を試みる予定だった
しかし想定通りに動作せず、難航していた

## References

- [Discordの関連スレッド](https://discord.com/channels/1126373101832257628/1364249825071206535)

# Decision

`@prisma/client`を用いることを断念
`supabase/supabase-js`を用いてsupabaseのedge functions内はDBに接続するようにした

## Reason

1. supabaseはedge環境で動いているから、prisma clientをサーバー上で生成して使えないのでprisma clientごとedgeに載せる必要がある
2. prisma clientのoutputをnode_modulesの外に出してviteと共通化させたいが外に出すとviteの仕様でviteが動かない(denoは動きそう)
3. supabase内のprisma clientとサーバーのprisma clientのjsの実行環境が違うので, deno用に出力したclientはnode環境で動くのか怪しい

以上より、honoアプリとsupabase functionsで共通のインターフェースによってDB接続を行うことを断念した
そして、supabaseが提供しているライブラリを用いてDBへ接続を行うようにした

# Consequences

supabase環境とhono環境が分離され、正常にsupabase edge functionsで動作するようになった
